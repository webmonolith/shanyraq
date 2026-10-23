import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { baseRate, claimDuty, claimPenalty, taxPenalty } from '../src/claim'
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
    expect(baseRate('2026-10-26')).toEqual({ rate: 16.25, since: '2026-09-07', stale: false })
    expect(baseRate('2026-10-27')).toEqual({ rate: 15.75, since: '2026-10-27', stale: false })
    expect(baseRate('2026-12-04')?.stale).toBe(false)
    expect(baseRate('2026-12-05')).toEqual({ rate: 15.75, since: '2026-10-27', stale: true })
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
    expect(val(claimPenalty(100, '2026-01-01', '2026-12-31')).stale).toBe(true)
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

describe('taxPenalty', () => {
  it('1.25 × base rate / 365 per day, from the day after due to the payment day', () => {
    expect(val(taxPenalty(100000, '2026-07-31', '2026-08-10'))).toEqual({
      debt: 100000,
      rest: 100000,
      days: 10,
      parts: [
        {
          from: '2026-08-01',
          to: '2026-08-10',
          days: 10,
          amount: 100000,
          baseRate: 16.75,
          rate: 20.9375,
          penalty: 573.63,
        },
      ],
      penalty: 573.63,
      total: 100573.63,
      stale: false,
    })
    expect(val(taxPenalty('100 000', '2026-09-30', '2026-10-10')).penalty).toBe(556.51)
    expect(
      val(taxPenalty(100000, '2026-07-31', '2026-08-10', { monitoring: true })).parts[0]?.rate,
    ).toBe(10.8875)
  })

  it('rate of each day and partial payments split the period', () => {
    const v = val(
      taxPenalty(1000000, '2026-05-31', '2026-07-31', {
        payments: [{ date: '2026-06-20', amount: 400000 }],
      }),
    )
    expect(v.parts.map((p) => [p.from, p.to, p.amount, p.baseRate, p.penalty])).toEqual([
      ['2026-06-01', '2026-06-07', 1000000, 18, 4315.07],
      ['2026-06-08', '2026-06-20', 1000000, 17, 7568.49],
      ['2026-06-21', '2026-07-26', 600000, 17, 12575.34],
      ['2026-07-27', '2026-07-31', 600000, 16.75, 1720.89],
    ])
    expect(v).toMatchObject({ rest: 600000, days: 61, penalty: 26179.79, total: 626179.79 })
  })

  it('stops on full payment; payment on the due day; stale; nothing overdue', () => {
    const paid = val(
      taxPenalty(100, '2026-01-01', '2026-03-01', {
        payments: [
          { date: '2026-01-10', amount: 60 },
          { date: '2026-01-01', amount: 40 },
        ],
      }),
    )
    expect(paid).toMatchObject({ rest: 0, days: 9, total: paid.penalty })
    expect(paid.parts).toEqual([
      {
        from: '2026-01-02',
        to: '2026-01-10',
        days: 9,
        amount: 60,
        baseRate: 18,
        rate: 22.5,
        penalty: 0.33,
      },
    ])
    expect(val(taxPenalty(100, '2026-10-01', '2026-12-31')).stale).toBe(true)
    expect(val(taxPenalty(100, '2026-01-01', '2026-01-01'))).toMatchObject({
      days: 0,
      penalty: 0,
      parts: [],
    })
    expect(val(taxPenalty(0, '2026-01-01', '2026-02-01')).parts).toEqual([])
  })

  it('errors', () => {
    expect(taxPenalty('x', '2026-01-01', '2026-02-01')).toEqual({ ok: false, error: 'invalid' })
    expect(taxPenalty(1, '2026-02-30', '2026-03-01')).toEqual({ ok: false, error: 'date' })
    expect(taxPenalty(1, '2026-02-01', '2026-01-01')).toEqual({ ok: false, error: 'range' })
    expect(taxPenalty(1, '2017-12-30', '2018-02-01')).toEqual({ ok: false, error: 'data' })
    expect(val(taxPenalty(1000, '2017-12-31', '2018-01-01')).parts[0]?.baseRate).toBe(10.25)
    const pay = (date: string, amount: number | string) =>
      taxPenalty(100, '2026-01-01', '2026-02-01', { payments: [{ date, amount }] })
    expect(pay('2026-01-10', 101)).toEqual({ ok: false, error: 'range' })
    expect(pay('2025-12-31', 1)).toEqual({ ok: false, error: 'range' })
    expect(pay('x', 1)).toEqual({ ok: false, error: 'date' })
    expect(pay('2026-01-10', 'x')).toEqual({ ok: false, error: 'invalid' })
  })

  it('property: equals the sum over days of debt × 1.25 × baseRate(day) / 365', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1e9 }),
        fc.integer({ min: 0, max: 3100 }),
        fc.integer({ min: 0, max: 400 }),
        (debt, start, length) => {
          const iso = (n: number) => new Date(Date.UTC(2018, 0, n)).toISOString().slice(0, 10)
          const v = val(taxPenalty(debt, iso(start), iso(start + length)))
          let sum = 0
          for (let d = start + 1; d <= start + length; d++)
            sum += (debt * 1.25 * (baseRate(iso(d))?.rate ?? 0)) / 100 / 365
          expect(v.penalty).toBeCloseTo(sum, -1)
          expect(v.days).toBe(debt > 0 ? length : 0)
        },
      ),
      { numRuns: 200 },
    )
  })
})

describe('claimDuty', () => {
  it('1 % for individuals, 3 % for legal entities, MRP caps', () => {
    expect(val(claimDuty(1000000))).toEqual({ percent: 1, duty: 10000, capped: false })
    expect(val(claimDuty('1 108 184,93')).duty).toBe(11081.85)
    expect(val(claimDuty(1000000, { payer: 'legal' })).duty).toBe(30000)
    // keys of the duty table that are not payers
    expect(claimDuty(100, { payer: 'courtOrderShare' as never })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(claimDuty(100, { payer: 'toString' as never })).toEqual({ ok: false, error: 'range' })
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
