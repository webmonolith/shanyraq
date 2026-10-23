import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { baseRate, claimDuty, claimPenalty } from '../src/claim'
import type { Result } from '../src/core/result'

const val = <T>(r: Result<T, string>): T => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe('baseRate', () => {
  it('rate in force on a date, from the decision date', () => {
    expect(baseRate('2026-10-01')).toEqual({ rate: 16.25, since: '2026-09-07', stale: false })
    expect(baseRate('2026-09-06')?.rate).toBe(16.75)
    expect(baseRate('2020-03-10')?.rate).toBe(12)
    expect(baseRate('2022-02-24')).toMatchObject({ rate: 13.5, since: '2022-02-24' })
  })

  it('refinancing rate equals the base rate since 1 April 2017', () => {
    expect(baseRate('2017-04-01')).toEqual({ rate: 11, since: '2017-02-21', stale: false })
    expect(baseRate('2017-03-31')).toBeUndefined()
    expect(baseRate('not a date')).toBeUndefined()
  })

  it('after the next scheduled decision the rate is stale', () => {
    expect(baseRate('2026-10-23')?.stale).toBe(false)
    expect(baseRate('2026-10-24')).toEqual({ rate: 16.25, since: '2026-09-07', stale: true })
  })
})

describe('claimPenalty', () => {
  it('debt × base rate on the last day × days / 365', () => {
    expect(val(claimPenalty(1000000, '2026-01-31', '2026-10-01'))).toEqual({
      debt: 1000000,
      rest: 1000000,
      parts: [
        {
          amount: 1000000,
          paid: false,
          date: '2026-10-01',
          days: 243,
          rate: 16.25,
          penalty: 108184.93,
        },
      ],
      penalty: 108184.93,
      total: 1108184.93,
      stale: false,
    })
    expect(val(claimPenalty('1 000 000', '2026-01-31', '2026-10-01', { basis: 360 })).penalty).toBe(
      109687.5,
    )
  })

  it('partial payments: each part by the rate on its payment day', () => {
    const v = val(
      claimPenalty(1000000, '2025-12-31', '2026-10-01', {
        payments: [{ date: '2026-06-10', amount: '400000' }],
      }),
    )
    expect(v.parts).toEqual([
      { amount: 400000, paid: true, date: '2026-06-10', days: 161, rate: 17, penalty: 29994.52 },
      {
        amount: 600000,
        paid: false,
        date: '2026-10-01',
        days: 274,
        rate: 16.25,
        penalty: 73191.78,
      },
    ])
    expect(v).toMatchObject({ rest: 600000, penalty: 103186.3, total: 703186.3 })
  })

  it('one rate date chosen by the creditor', () => {
    const v = val(
      claimPenalty(1000000, '2025-12-31', '2026-10-01', {
        payments: [{ date: '2026-06-10', amount: 400000 }],
        rateDate: '2026-10-01',
      }),
    )
    expect(v.parts.map((p) => p.penalty)).toEqual([28671.23, 73191.78])
    expect(v.penalty).toBe(101863.01)
  })

  it('payments are sorted by date', () => {
    const v = val(
      claimPenalty(300, '2026-01-01', '2026-03-01', {
        payments: [
          { date: '2026-02-01', amount: 100 },
          { date: '2026-01-11', amount: 100 },
        ],
        rate: 36.5,
      }),
    )
    expect(v.parts.map((p) => [p.date, p.days, p.penalty])).toEqual([
      ['2026-01-11', 10, 1],
      ['2026-02-01', 31, 3.1],
      ['2026-03-01', 59, 5.9],
    ])
  })

  it('fully paid debt has no rest; own rate; stale flag', () => {
    const paid = val(
      claimPenalty(100, '2026-01-01', '2026-02-01', {
        payments: [{ date: '2026-01-11', amount: 100 }],
        rate: 36.5,
      }),
    )
    expect(paid).toMatchObject({ rest: 0, penalty: 1, total: 1 })
    expect(paid.parts).toHaveLength(1)
    expect(val(claimPenalty(100, '2026-01-01', '2026-01-01')).penalty).toBe(0)
    expect(val(claimPenalty(100, '2026-01-01', '2026-12-01')).stale).toBe(true)
  })

  it('errors', () => {
    expect(claimPenalty('x', '2026-01-01', '2026-02-01')).toEqual({ ok: false, error: 'invalid' })
    expect(claimPenalty(-1, '2026-01-01', '2026-02-01')).toEqual({ ok: false, error: 'range' })
    expect(claimPenalty(1, '2026-02-30', '2026-03-01')).toEqual({ ok: false, error: 'date' })
    expect(claimPenalty(1, '2026-02-01', '2026-01-01')).toEqual({ ok: false, error: 'range' })
    expect(claimPenalty(1, '2026-01-01', '2026-02-01', { rateDate: 'x' })).toEqual({
      ok: false,
      error: 'date',
    })
    expect(claimPenalty(1, '2026-01-01', '2026-02-01', { basis: 300 as 365 })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(claimPenalty(1, '2026-01-01', '2026-02-01', { rate: -1 })).toEqual({
      ok: false,
      error: 'range',
    })
    const pay = (date: string, amount: number | string) =>
      claimPenalty(100, '2026-01-01', '2026-02-01', { payments: [{ date, amount }] })
    expect(pay('2026-01-10', 101)).toEqual({ ok: false, error: 'range' })
    expect(pay('2025-12-31', 1)).toEqual({ ok: false, error: 'range' })
    expect(pay('2026-02-02', 1)).toEqual({ ok: false, error: 'range' })
    expect(pay('x', 1)).toEqual({ ok: false, error: 'date' })
    expect(pay('2026-01-10', 'x')).toEqual({ ok: false, error: 'invalid' })
    expect(claimPenalty(1, '2017-01-01', '2017-03-01')).toEqual({ ok: false, error: 'data' })
  })

  it('property: one rate → penalty = debt × rate × days / basis', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1e9 }),
        fc.integer({ min: 0, max: 3000 }),
        fc.double({ min: 0, max: 50, noNaN: true }),
        fc.constantFrom(360 as const, 365 as const),
        (debt, days, rate, basis) => {
          const until = new Date(Date.UTC(2020, 0, 1 + days)).toISOString().slice(0, 10)
          const v = val(claimPenalty(debt, '2020-01-01', until, { rate, basis }))
          expect(v.penalty).toBeCloseTo((debt * rate * days) / 100 / basis, 1)
          expect(v.total).toBeCloseTo(v.rest + v.penalty, 2)
        },
      ),
    )
  })
})

describe('claimDuty', () => {
  it('1 % for individuals, 3 % for legal entities, MRP caps', () => {
    expect(val(claimDuty(1000000))).toEqual({ percent: 1, duty: 10000, capped: false })
    expect(val(claimDuty('1 108 184,93')).duty).toBe(11081.85)
    expect(val(claimDuty(1000000, { payer: 'legal' })).duty).toBe(30000)
    expect(val(claimDuty(1e10))).toEqual({ percent: 1, duty: 43250000, capped: true })
    expect(val(claimDuty(1e10, { payer: 'legal' })).duty).toBe(86500000)
  })

  it('court order: half the rate', () => {
    expect(val(claimDuty(1000000, { courtOrder: true }))).toEqual({
      percent: 0.5,
      duty: 5000,
      capped: false,
    })
  })

  it('errors', () => {
    expect(claimDuty('x')).toEqual({ ok: false, error: 'invalid' })
    expect(claimDuty(1, { year: 2020 })).toEqual({ ok: false, error: 'data' })
    expect(claimDuty(1, { payer: 'other' as 'legal' })).toEqual({ ok: false, error: 'range' })
  })
})
