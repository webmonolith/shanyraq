import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { countWorkingDays } from '../src/calendar'
import type { Result } from '../src/core/result'
import { dismissalPay, sickPay, vacationPay } from '../src/leave'

const val = <T>(r: Result<T, string>): T => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe('vacationPay', () => {
  it('24 days from 1 July 2026: Capital Day extends the leave', () => {
    const v = val(vacationPay(3600000, '2026-07-01'))
    expect(v).toMatchObject({
      start: '2026-07-01',
      end: '2026-07-25',
      days: 24,
      holidays: ['2026-07-06'],
      workingDays: 17,
      period: { from: '2025-07-01', to: '2026-06-30', workingDays: 246 },
      dailyWage: 14634.15,
      pay: 248780.55,
    })
  })

  it('Nauryz and 8 March extend the leave; shifted days off do not, and are not paid', () => {
    const v = val(vacationPay(3600000, new Date(2026, 2, 2), 24))
    expect(v.holidays).toEqual(['2026-03-08', '2026-03-21', '2026-03-22', '2026-03-23'])
    expect(v.end).toBe('2026-03-29')
    expect(v.workingDays).toBe(16)
    expect(v.period).toEqual({ from: '2025-03-01', to: '2026-02-28', workingDays: 245 })
  })

  it('accepts string earnings and worked days', () => {
    const v = val(vacationPay('1 200 000,50', '2026-07-01', 10, { workedDays: 100 }))
    expect(v.dailyWage).toBe(12000.01)
    expect(v.period.workingDays).toBe(100)
  })

  it('period of January crosses into the previous year', () => {
    expect(val(vacationPay(0, '2026-01-15', 1)).period).toMatchObject({
      from: '2025-01-01',
      to: '2025-12-31',
    })
  })

  it('errors', () => {
    expect(vacationPay(100, 'nope')).toEqual({ ok: false, error: 'date' })
    expect(vacationPay('abc', '2026-07-01')).toEqual({ ok: false, error: 'invalid' })
    expect(vacationPay(-1, '2026-07-01')).toEqual({ ok: false, error: 'range' })
    expect(vacationPay(1e14, '2026-07-01')).toEqual({ ok: false, error: 'range' })
    expect(vacationPay(100, '2026-07-01', 0)).toEqual({ ok: false, error: 'range' })
    expect(vacationPay(100, '2026-07-01', 1.5)).toEqual({ ok: false, error: 'range' })
    expect(vacationPay(100, '2026-07-01', 24, { workedDays: 0 })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(vacationPay(100, '1000-03-01')).toEqual({ ok: false, error: 'range' })
    expect(vacationPay(100, '9999-12-20', 30)).toEqual({ ok: false, error: 'range' })
    expect(vacationPay(100, '2031-07-01', 24, { calendar: { strict: true } })).toEqual({
      ok: false,
      error: 'data',
    })
    expect(
      vacationPay(100, '2027-12-20', 24, {
        workedDays: 200,
        calendar: { strict: true },
      }),
    ).toEqual({ ok: false, error: 'range' })
  })

  it('pay = daily wage × working days inside the leave', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1e9 }),
        fc.integer({ min: 0, max: 700 }),
        fc.integer({ min: 1, max: 60 }),
        (earnings, offset, days) => {
          const start = new Date(Date.UTC(2025, 0, 1) + offset * 864e5).toISOString().slice(0, 10)
          const v = val(vacationPay(earnings, start, days))
          expect(v.workingDays).toBe(val(countWorkingDays(v.start, v.end)))
          expect(v.pay).toBeCloseTo(v.dailyWage * v.workingDays, 2)
          expect(v.workingDays).toBeLessThanOrEqual(days)
        },
      ),
      { numRuns: 200 },
    )
  })
})

describe('sickPay', () => {
  it('a working week in March 2026', () => {
    expect(val(sickPay(3600000, '2026-03-02', '2026-03-06'))).toEqual({
      from: '2026-03-02',
      to: '2026-03-06',
      workingDays: 5,
      period: { from: '2025-03-01', to: '2026-02-28', workingDays: 245 },
      dailyWage: 14693.88,
      months: [{ month: '2026-03', workingDays: 5, cap: 108125, pay: 73469.4 }],
      capped: false,
      pay: 73469.4,
    })
  })

  it('25 MRP cap per calendar month', () => {
    const s = val(sickPay(12000000, '2026-04-20', '2026-05-15'))
    expect(s.months).toEqual([
      { month: '2026-04', workingDays: 9, cap: 108125, pay: 108125 },
      { month: '2026-05', workingDays: 8, cap: 108125, pay: 108125 },
    ])
    expect(s.capped).toBe(true)
    expect(s.pay).toBe(216250)
    expect(s.workingDays).toBe(17)
  })

  it('errors', () => {
    expect(sickPay(100, '2026-03-02', 'x')).toEqual({ ok: false, error: 'date' })
    expect(sickPay(100, '2026-03-06', '2026-03-02')).toEqual({ ok: false, error: 'range' })
    expect(sickPay(100, '2026-01-01', '2027-06-01')).toEqual({ ok: false, error: 'range' })
    expect(sickPay('x', '2026-03-02', '2026-03-06')).toEqual({ ok: false, error: 'invalid' })
    // no MRP for 2027 yet
    expect(sickPay(100, '2026-12-28', '2027-01-05')).toEqual({ ok: false, error: 'data' })
    expect(sickPay(100, '2026-03-02', '2026-03-06', { workedDays: 10 })).toMatchObject({
      ok: true,
      value: { dailyWage: 10 },
    })
  })
})

describe('dismissalPay', () => {
  it('reduction on 30 June 2026: last month salary, 12 unused days, one month of average wage', () => {
    const v = val(
      dismissalPay(3600000, '2026-06-30', { unusedDays: 12, reason: 'reduction', salary: 300000 }),
    )
    expect(v).toMatchObject({
      end: '2026-06-30',
      payBy: '2026-07-03',
      period: { from: '2025-06-01', to: '2026-05-31', workingDays: 244 },
      dailyWage: 14754.1,
      salary: { workingDays: 22, monthWorkingDays: 22, pay: 300000 },
      compensation: {
        start: '2026-07-01',
        end: '2026-07-13',
        holidays: ['2026-07-06'],
        workingDays: 8,
        pay: 118032.8,
      },
      severance: {
        months: 1,
        from: '2026-07-01',
        to: '2026-07-31',
        workingDays: 22,
        pay: 324590.2,
      },
      pay: 742623,
    })
  })

  it('compensation starts on the next working day; decline pays two months', () => {
    const v = val(dismissalPay(3600000, '2026-12-31', { unusedDays: 24, reason: 'decline' }))
    expect(v.payBy).toBe('2027-01-08')
    expect(v.compensation?.start).toBe('2027-01-05')
    expect(v.severance).toMatchObject({ months: 2, from: '2027-01-01', to: '2027-02-28' })
    expect(v.salary).toBeUndefined()
  })

  it('month end clamps: 30 January + 1 month ends on 28 February', () => {
    const v = val(dismissalPay(1000000, '2026-01-30', { reason: 'liquidation' }))
    expect(v.severance).toMatchObject({ from: '2026-01-31', to: '2026-02-28' })
    const w = val(dismissalPay(1000000, '2026-01-27', { reason: 'liquidation' }))
    expect(w.severance).toMatchObject({ from: '2026-01-28', to: '2026-02-27' })
  })

  it('a shorter next month still ends on its last day', () => {
    const v = val(dismissalPay(3600000, '2026-03-30', { reason: 'reduction' }))
    expect(v.severance).toMatchObject({ from: '2026-03-31', to: '2026-04-30', workingDays: 23 })
  })

  it('other ground, no unused days: salary only', () => {
    const v = val(dismissalPay(1000000, '2026-03-13', { salary: '360 000' }))
    expect(v.compensation).toBeUndefined()
    expect(v.severance).toBeUndefined()
    expect(v.salary).toEqual({ workingDays: 9, monthWorkingDays: 18, pay: 180000 })
    expect(v.pay).toBe(180000)
  })

  it('errors', () => {
    expect(dismissalPay(100, 'nope')).toEqual({ ok: false, error: 'date' })
    expect(dismissalPay('x', '2026-06-30')).toEqual({ ok: false, error: 'invalid' })
    expect(dismissalPay(100, '2026-06-30', { salary: 'x' })).toEqual({
      ok: false,
      error: 'invalid',
    })
    expect(dismissalPay(100, '2026-06-30', { unusedDays: -1 })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(dismissalPay(100, '2026-06-30', { unusedDays: 1.5 })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(dismissalPay(100, '1000-03-01')).toEqual({ ok: false, error: 'range' })
    expect(dismissalPay(100, '2030-12-31', { calendar: { strict: true } })).toEqual({
      ok: false,
      error: 'data',
    })
    expect(dismissalPay(100, '2027-12-24', { unusedDays: 24, calendar: { strict: true } })).toEqual(
      { ok: false, error: 'range' },
    )
    expect(
      dismissalPay(100, '2027-12-24', { reason: 'decline', calendar: { strict: true } }),
    ).toEqual({ ok: false, error: 'data' })
  })

  it('pay = sum of its parts; compensation = daily wage × its working days', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1e9 }),
        fc.integer({ min: 0, max: 600 }),
        fc.integer({ min: 0, max: 60 }),
        fc.constantFrom('liquidation', 'reduction', 'breach', 'decline', 'other' as const),
        (earnings, offset, unusedDays, reason) => {
          const end = new Date(Date.UTC(2025, 0, 1) + offset * 864e5).toISOString().slice(0, 10)
          const v = val(dismissalPay(earnings, end, { unusedDays, reason, salary: 500000 }))
          const parts = (v.salary?.pay ?? 0) + (v.compensation?.pay ?? 0) + (v.severance?.pay ?? 0)
          expect(Math.abs(v.pay - parts)).toBeLessThan(0.01)
          if (v.compensation)
            expect(v.compensation.pay).toBeCloseTo(v.dailyWage * v.compensation.workingDays, 2)
          expect(v.payBy > v.end).toBe(true)
        },
      ),
    )
  })
})
