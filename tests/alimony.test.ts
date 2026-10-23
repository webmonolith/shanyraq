import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { alimony, alimonyPenalty } from '../src/alimony'
import type { Result } from '../src/core/result'
import { calculateSalary } from '../src/tax'

const val = <T>(r: Result<T, string>): T => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe('alimony', () => {
  it('statutory shares: 1/4, 1/3, 1/2 for three and more', () => {
    expect(val(alimony(300000)).amount).toBe(75000)
    expect(val(alimony(300000, { children: 2 }))).toMatchObject({ percent: 33.33, amount: 100000 })
    expect(val(alimony(300000, { children: 3 })).amount).toBe(150000)
    expect(val(alimony('300 000', { children: 5 })).amount).toBe(150000)
  })

  it('gross salary: taken from the pay after ОПВ, ВОСМС and ИПН', () => {
    const v = val(alimony(500000, { children: 2, gross: true }))
    expect(v).toEqual({
      base: 408975,
      percent: 33.33,
      byShare: 136325,
      fixed: 0,
      amount: 136325,
      capped: false,
      kept: 272650,
    })
  })

  it('fixed sum in MRP, alone or on top of the share; 50 % limit', () => {
    expect(val(alimony(100000, { mrp: 10 }))).toMatchObject({
      percent: 0,
      fixed: 43250,
      amount: 43250,
    })
    const both = val(alimony(300000, { children: 3, mrp: 20 }))
    expect(both).toMatchObject({
      byShare: 150000,
      fixed: 86500,
      amount: 150000,
      capped: true,
      kept: 150000,
    })
  })

  it('court share', () => {
    expect(val(alimony(300000, { percent: 40 })).amount).toBe(120000)
    expect(val(alimony(300000, { children: 0 })).amount).toBe(0)
  })

  it('errors', () => {
    expect(alimony('x')).toEqual({ ok: false, error: 'invalid' })
    expect(alimony(-1)).toEqual({ ok: false, error: 'range' })
    expect(alimony(100, { children: 1.5 })).toEqual({ ok: false, error: 'range' })
    expect(alimony(100, { percent: 0 })).toEqual({ ok: false, error: 'range' })
    expect(alimony(100, { percent: 101 })).toEqual({ ok: false, error: 'range' })
    expect(alimony(100, { mrp: -1 })).toEqual({ ok: false, error: 'range' })
    expect(alimony(100, { year: 1990 })).toEqual({ ok: false, error: 'data' })
    expect(alimony(100, { gross: true, salary: { month: 13 } })).toEqual({
      ok: false,
      error: 'range',
    })
  })

  it('never takes more than half; amount + kept = base', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1e8 }),
        fc.integer({ min: 0, max: 6 }),
        fc.integer({ min: 0, max: 200 }),
        fc.boolean(),
        (income, children, mrp, gross) => {
          const v = val(alimony(income, { children, mrp, gross }))
          if (gross) expect(v.base).toBe(val(calculateSalary(income)).net)
          expect(v.amount).toBeLessThanOrEqual(v.base / 2 + 0.005)
          expect(Math.abs(v.amount + v.kept - v.base)).toBeLessThan(0.01)
          expect(v.capped).toBe(v.byShare + v.fixed > v.amount + 0.005)
        },
      ),
    )
  })
})

describe('alimonyPenalty', () => {
  it('0.1 % per day of delay', () => {
    expect(val(alimonyPenalty(100000, '2026-01-31', '2026-03-02'))).toEqual({
      days: 30,
      penalty: 3000,
    })
    expect(val(alimonyPenalty('1 000', '2026-01-31', '2026-01-20'))).toEqual({
      days: 0,
      penalty: 0,
    })
  })

  it('errors', () => {
    expect(alimonyPenalty('x', '2026-01-01', '2026-02-01')).toEqual({ ok: false, error: 'invalid' })
    expect(alimonyPenalty(1, 'nope', '2026-02-01')).toEqual({ ok: false, error: 'date' })
  })
})
