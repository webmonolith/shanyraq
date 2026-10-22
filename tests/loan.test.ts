import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Result } from '../src/core/result'
import { effectiveRate, gesvLimit, loanSchedule } from '../src/loan'

const val = <T>(r: Result<T, string>): T => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe('loanSchedule', () => {
  it('annuity: 1 000 000 at 20 % for 12 months', () => {
    const l = val(loanSchedule(1000000, 20, 12))
    expect(l).toMatchObject({
      monthly: 92634.51,
      interest: 111614.09,
      fees: 0,
      total: 1111614.09,
      overpayment: 111614.09,
      apr: 21.94,
    })
    expect(l.payments).toHaveLength(12)
    expect(l.payments[0]).toEqual({
      n: 1,
      payment: 92634.51,
      principal: 75967.84,
      interest: 16666.67,
      prepayment: 0,
      fee: 0,
      balance: 924032.16,
    })
    expect(l.payments[11]).toMatchObject({ payment: 92634.48, balance: 0 })
  })

  it('differentiated: equal principal, falling payments', () => {
    const l = val(loanSchedule('1 000 000', 20, 12, { method: 'differentiated' }))
    expect(l.monthly).toBe(100000)
    expect(l.interest).toBe(108333.34)
    expect(l.apr).toBe(21.94)
    expect(l.payments[11]).toMatchObject({ principal: 83333.37, interest: 1388.89, balance: 0 })
  })

  it('7-20-25: 20 mln at 7 % for 25 years — ГЭСВ ≈ 7.2 % as the programme states', () => {
    const l = val(loanSchedule(20000000, 7, 300, { start: '2026-10-23' }))
    expect(l.monthly).toBe(141355.84)
    expect(l.apr).toBe(7.22)
    expect(l.payments[299]).toMatchObject({ date: '2051-10-23', balance: 0 })
  })

  it('dates keep the issue day, clamped to short months', () => {
    const l = val(loanSchedule(1000000, 20, 3, { start: new Date(2026, 0, 31) }))
    expect(l.payments.map((p) => p.date)).toEqual(['2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('fees raise ГЭСВ and the total', () => {
    const l = val(
      loanSchedule(1000000, 20, 12, { fee: 20000, monthlyFee: 1000, start: '2026-01-31' }),
    )
    expect(l.fees).toBe(32000)
    expect(l.payments[0]?.fee).toBe(1000)
    expect(l.apr).toBe(29.62)
  })

  it('prepayment shortens the term by default', () => {
    const l = val(loanSchedule(1000000, 20, 12, { prepayments: [{ month: 3, amount: 300000 }] }))
    expect(l.payments).toHaveLength(9)
    expect(l.payments[2]?.prepayment).toBe(300000)
    expect(l.payments[3]?.payment).toBe(92634.51)
    expect(l.monthly).toBe(92634.51)
    expect(l.apr).toBe(21.94)
  })

  it('prepayment can lower the payment instead', () => {
    const l = val(
      loanSchedule(1000000, 20, 12, {
        prepayments: [{ month: 3, amount: 300000, reduce: 'payment' }],
      }),
    )
    expect(l.payments).toHaveLength(12)
    expect(l.payments[3]).toMatchObject({ payment: 56462.2, principal: 48657.58 })
    expect(l.payments[11]?.balance).toBe(0)
  })

  it('differentiated prepayment lowering the payment', () => {
    const l = val(
      loanSchedule(1000000, 20, 12, {
        method: 'differentiated',
        prepayments: [{ month: 2, amount: 500000, reduce: 'payment' }],
      }),
    )
    expect(l.payments[2]?.principal).toBe(33333.33)
    expect(l.payments).toHaveLength(12)
  })

  it('prepayment larger than the debt closes the loan', () => {
    const l = val(loanSchedule(1000000, 20, 12, { prepayments: [{ month: 1, amount: 5e6 }] }))
    expect(l.payments).toHaveLength(1)
    expect(l.payments[0]).toMatchObject({ prepayment: 924032.16, balance: 0 })
    expect(l.monthly).toBe(92634.51)
  })

  it('zero rate', () => {
    const l = val(loanSchedule(1000000, 0, 10))
    expect(l).toMatchObject({ monthly: 100000, interest: 0, apr: 0 })
  })

  it('errors', () => {
    expect(loanSchedule('abc', 20, 12)).toEqual({ ok: false, error: 'invalid' })
    expect(loanSchedule(0, 20, 12)).toEqual({ ok: false, error: 'range' })
    expect(loanSchedule(1e13, 20, 12)).toEqual({ ok: false, error: 'range' })
    expect(loanSchedule(1000, -1, 12)).toEqual({ ok: false, error: 'range' })
    expect(loanSchedule(1000, 1001, 12)).toEqual({ ok: false, error: 'range' })
    expect(loanSchedule(1000, 20, 0)).toEqual({ ok: false, error: 'range' })
    expect(loanSchedule(1000, 20, 601)).toEqual({ ok: false, error: 'range' })
    expect(loanSchedule(1000, 20, 1.5)).toEqual({ ok: false, error: 'range' })
    expect(loanSchedule(1000, 20, 12, { fee: -1 })).toEqual({ ok: false, error: 'range' })
    expect(loanSchedule(1000, 20, 12, { monthlyFee: Number.NaN })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(loanSchedule(1000, 20, 12, { prepayments: [{ month: 0, amount: 1 }] })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(loanSchedule(1000, 20, 12, { prepayments: [{ month: 1, amount: 0 }] })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(loanSchedule(1000, 20, 12, { start: '2026-02-30' })).toEqual({
      ok: false,
      error: 'date',
    })
    expect(loanSchedule(1000, 20, 12, { fee: 1000 })).toEqual({ ok: false, error: 'range' })
  })

  it('property: principal and prepayments repay the amount; debt never grows', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 1e9 }),
        fc.integer({ min: 0, max: 5000 }).map((r) => r / 100),
        fc.integer({ min: 1, max: 360 }),
        fc.constantFrom('annuity' as const, 'differentiated' as const),
        fc.array(
          fc.record({
            month: fc.integer({ min: 1, max: 360 }),
            amount: fc.integer({ min: 1, max: 1e8 }),
            reduce: fc.constantFrom('term' as const, 'payment' as const),
          }),
          { maxLength: 3 },
        ),
        (amount, rate, months, method, prepayments) => {
          const l = val(loanSchedule(amount, rate, months, { method, prepayments }))
          const repaid = l.payments.reduce((s, p) => s + p.principal + p.prepayment, 0)
          expect(Math.abs(repaid - amount)).toBeLessThan(0.01 * l.payments.length + 0.01)
          expect(l.payments.length).toBeLessThanOrEqual(months)
          expect(l.payments[l.payments.length - 1]?.balance).toBe(0)
          for (let i = 1; i < l.payments.length; i++)
            expect(l.payments[i]?.balance).toBeLessThanOrEqual(l.payments[i - 1]?.balance as number)
        },
      ),
    )
  })

  it('property: without fees and dates ГЭСВ = (1 + rate/12)^12 − 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 1e9 }),
        fc.integer({ min: 100, max: 5000 }).map((r) => r / 100),
        fc.integer({ min: 6, max: 360 }),
        (amount, rate, months) => {
          const l = val(loanSchedule(amount, rate, months))
          const expected = ((1 + rate / 1200) ** 12 - 1) * 100
          expect(Math.abs(l.apr - expected)).toBeLessThan(0.02)
        },
      ),
    )
  })
})

describe('effectiveRate', () => {
  it('one payment a year later', () => {
    expect(effectiveRate(100000, [{ days: 365, amount: 110000 }])).toEqual({ ok: true, value: 10 })
  })

  it('rounds half up to the given decimals', () => {
    expect(val(effectiveRate(100000, [{ days: 365, amount: 112345 }], 1))).toBe(12.3)
    expect(val(effectiveRate(100000, [{ days: 365, amount: 112355 }], 1))).toBe(12.4)
    expect(val(effectiveRate(100000, [{ days: 365, amount: 112345 }]))).toBe(12.35)
  })

  it('negative when less is paid back', () => {
    expect(val(effectiveRate(100000, [{ days: 365, amount: 90000 }]))).toBe(-10)
  })

  it('errors', () => {
    expect(effectiveRate(0, [{ days: 1, amount: 1 }])).toEqual({ ok: false, error: 'range' })
    expect(effectiveRate(100, [])).toEqual({ ok: false, error: 'range' })
    expect(effectiveRate(100, [{ days: -1, amount: 1 }])).toEqual({ ok: false, error: 'range' })
    expect(effectiveRate(100, [{ days: 1, amount: -1 }])).toEqual({ ok: false, error: 'range' })
    expect(effectiveRate(100, [{ days: 365, amount: 0.5 }])).toEqual({ ok: false, error: 'range' })
    expect(effectiveRate(100, [{ days: 1, amount: 1e9 }])).toEqual({ ok: false, error: 'range' })
  })
})

describe('gesvLimit', () => {
  it('caps since 16 May 2026', () => {
    expect(gesvLimit('unsecured', '2026-05-16')).toEqual({ ok: true, value: 46 })
    expect(gesvLimit('secured', '2026-10-23')).toEqual({ ok: true, value: 35 })
    expect(gesvLimit('mortgage', '2026-10-23', 0.5)).toEqual({ ok: true, value: 25 })
    expect(gesvLimit('microcredit', new Date(2026, 9, 23))).toEqual({ ok: true, value: 46 })
    expect(gesvLimit('shortMicrocredit', '2026-12-31')).toEqual({ ok: true, value: 179 })
  })

  it('mortgage caps by loan-to-value from 2027', () => {
    expect(gesvLimit('mortgage', '2027-01-01', 0.7)).toEqual({ ok: true, value: 20 })
    expect(gesvLimit('mortgage', '2027-01-01', 0.71)).toEqual({ ok: true, value: 25 })
    expect(gesvLimit('mortgage', '2027-01-01')).toEqual({ ok: true, value: 25 })
  })

  it('errors', () => {
    expect(gesvLimit('unsecured', '2026-05-15')).toEqual({ ok: false, error: 'data' })
    expect(gesvLimit('unsecured', 'nope')).toEqual({ ok: false, error: 'date' })
    expect(gesvLimit('mortgage', '2027-01-01', 0)).toEqual({ ok: false, error: 'range' })
    expect(gesvLimit('other' as 'secured', '2027-01-01')).toEqual({ ok: false, error: 'invalid' })
  })
})
