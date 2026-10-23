import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Result } from '../src/core/result'
import { agePension, basicPension, pensionContributions, retirementAge } from '../src/pension'

const val = <T>(r: Result<T, string>): T => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe('retirementAge', () => {
  it('men 63, women by the schedule of art. 207 p. 1', () => {
    expect(val(retirementAge('1963-05-10', 'male'))).toEqual({ age: 63, date: '2026-05-10' })
    expect(val(retirementAge('1965-03-01', 'female'))).toEqual({ age: 61, date: '2026-03-01' })
    expect(val(retirementAge('1967-01-15', 'female'))).toEqual({ age: 61.5, date: '2028-07-15' })
    expect(val(retirementAge('1966-12-31', 'female'))).toEqual({ age: 61, date: '2027-12-31' })
    expect(val(retirementAge('1967-07-31', 'female'))).toEqual({ age: 62, date: '2029-07-31' })
    expect(val(retirementAge('1980-01-01', 'female'))).toEqual({ age: 63, date: '2043-01-01' })
  })

  it('early retirement (art. 207 p. 2–3)', () => {
    expect(val(retirementAge('1980-01-01', 'female', 'mother5'))).toEqual({
      age: 53,
      date: '2033-01-01',
    })
    expect(val(retirementAge('1960-01-01', 'male', 'semipalatinsk')).age).toBe(50)
    expect(retirementAge('1980-01-01', 'male', 'mother5')).toEqual({ ok: false, error: 'range' })
  })

  it('errors', () => {
    expect(retirementAge('1980-02-30', 'male')).toEqual({ ok: false, error: 'date' })
    expect(retirementAge('1980-01-01', 'x' as 'male')).toEqual({ ok: false, error: 'range' })
    expect(retirementAge('9990-01-01', 'male')).toEqual({ ok: false, error: 'range' })
  })

  it('property: the age reached on the date is never below the rule in force that day', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('1962-01-01'), max: new Date('1975-12-31'), noInvalidDate: true }),
        (d) => {
          const birth = d.toISOString().slice(0, 10)
          const r = val(retirementAge(birth, 'female'))
          const required =
            r.date >= '2031-01-01'
              ? 63
              : r.date >= '2030-01-01'
                ? 62.5
                : r.date >= '2029-01-01'
                  ? 62
                  : r.date >= '2028-01-01'
                    ? 61.5
                    : r.date >= '2023-01-01'
                      ? 61
                      : 60.5
          expect(r.age).toBe(required)
        },
      ),
    )
  })
})

describe('basicPension', () => {
  it('70 % of the subsistence minimum, +2 % per year over 10, ≤ 118 % (art. 206)', () => {
    expect(val(basicPension(0))).toEqual({ percent: 70, amount: 35596 })
    expect(val(basicPension(10.9))).toEqual({ percent: 70, amount: 35596 })
    expect(val(basicPension(30))).toEqual({ percent: 110, amount: 55936 })
    expect(val(basicPension(40))).toEqual({ percent: 118, amount: 60004 })
  })

  it('errors', () => {
    expect(basicPension(-1)).toEqual({ ok: false, error: 'range' })
    expect(basicPension(Number.NaN)).toEqual({ ok: false, error: 'range' })
    expect(basicPension(10, 2027)).toEqual({ ok: false, error: 'data' })
    expect(basicPension(10, 2020)).toEqual({ ok: false, error: 'data' })
  })
})

describe('agePension', () => {
  it('60 % of income capped at 55 MRP, partial by record before 1998 (art. 210–211)', () => {
    expect(val(agePension(300000, 12, 'female'))).toEqual({
      income: 237875,
      percent: 60,
      full: 142725,
      ratio: 0.6,
      amount: 85635,
    })
    expect(val(agePension('200 000', 30.5, 'male'))).toMatchObject({
      percent: 65,
      full: 130000,
      ratio: 1,
    })
    expect(val(agePension(500000, 50, 'male')).percent).toBe(75)
  })

  it('minimum pension and the 6-month threshold', () => {
    expect(val(agePension(50000, 25, 'male'))).toMatchObject({ full: 69049, amount: 69049 })
    expect(val(agePension(100000, 0.4, 'male'))).toMatchObject({ ratio: 0, amount: 0 })
    expect(val(agePension(100000, 0.5, 'male'))).toMatchObject({ ratio: 0.02, amount: 1381 })
  })

  it('errors', () => {
    expect(agePension('x', 1, 'male')).toEqual({ ok: false, error: 'invalid' })
    expect(agePension(-1, 1, 'male')).toEqual({ ok: false, error: 'range' })
    expect(agePension(1, 101, 'male')).toEqual({ ok: false, error: 'range' })
    expect(agePension(1, 1, 'x' as 'male')).toEqual({ ok: false, error: 'range' })
    expect(agePension(1, 1, 'male', 2020)).toEqual({ ok: false, error: 'data' })
  })
})

describe('pensionContributions', () => {
  it('ОПВ 10 % and ОПВР 3.5 → 4.5 → 5 % from the next month to the retirement month', () => {
    expect(val(pensionContributions(400000, '2026-10-23', '2046-10-23'))).toEqual({
      months: 240,
      opv: 9600000,
      opvr: 4764000,
      total: 14364000,
    })
  })

  it('self-employed, savings, minimum ОПВР base, 50 МЗП cap', () => {
    expect(
      val(
        pensionContributions(400000, '2026-12-01', '2027-02-01', {
          employee: false,
          savings: '1 000 000',
        }),
      ),
    ).toEqual({
      months: 2,
      opv: 80000,
      opvr: 0,
      total: 1080000,
    })
    expect(val(pensionContributions(50000, '2026-11-15', '2026-12-31')).opvr).toBe(2975)
    expect(val(pensionContributions(10000000, '2026-11-15', '2026-12-31')).opv).toBe(425000)
    expect(val(pensionContributions(0, '2026-11-15', '2026-12-31')).total).toBe(0)
    expect(val(pensionContributions(100000, '2030-01-01', '2026-01-01')).months).toBe(0)
  })

  it('errors', () => {
    expect(pensionContributions('x', '2026-01-01', '2027-01-01')).toEqual({
      ok: false,
      error: 'invalid',
    })
    expect(pensionContributions(1, '2026-01-01', '2027-01-01', { savings: -1 })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(pensionContributions(1, '2026-13-01', '2027-01-01')).toEqual({
      ok: false,
      error: 'date',
    })
    expect(pensionContributions(1, '2026-01-01', '2200-01-01')).toEqual({
      ok: false,
      error: 'range',
    })
  })
})
