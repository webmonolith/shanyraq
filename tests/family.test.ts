import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Result } from '../src/core/result'
import { birthAllowance, careAllowance, childcarePay, maternityPay } from '../src/family'

const val = <T>(r: Result<T, string>): T => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe('maternityPay', () => {
  it('average base × days / 30, ОПВ 10 % withheld', () => {
    expect(val(maternityPay(500000))).toEqual({
      average: 450000,
      days: 126,
      coefficient: 4.2,
      amount: 1890000,
      opv: 189000,
      net: 1701000,
    })
  })

  it('leave lengths of Labour Code art. 99 and custom days', () => {
    expect(val(maternityPay(500000, { leave: 'complicated' })).amount).toBe(2100000)
    expect(val(maternityPay(500000, { leave: 'nuclear' })).days).toBe(170)
    expect(val(maternityPay(500000, { leave: 'nuclearComplicated' })).amount).toBe(2760000)
    expect(val(maternityPay(500000, { days: 56 })).amount).toBe(840000)
  })

  it('base: salary − ОПВ within 1–7 MZP; months without contributions count as zero', () => {
    expect(val(maternityPay('2 000 000')).amount).toBe(2499000)
    expect(val(maternityPay(50000)).average).toBe(85000)
    expect(val(maternityPay(0)).amount).toBe(0)
    expect(val(maternityPay(500000, { months: 6 })).amount).toBe(945000)
    expect(val(maternityPay(300000, { gross: false })).average).toBe(300000)
    expect(val(maternityPay(1000000, { gross: false })).average).toBe(1000000)
  })

  it('errors', () => {
    expect(maternityPay('x')).toEqual({ ok: false, error: 'invalid' })
    expect(maternityPay(-1)).toEqual({ ok: false, error: 'range' })
    expect(maternityPay(1, { days: 0 })).toEqual({ ok: false, error: 'range' })
    expect(maternityPay(1, { months: 13 })).toEqual({ ok: false, error: 'range' })
    expect(maternityPay(1, { year: 2020 })).toEqual({ ok: false, error: 'data' })
  })
})

describe('childcarePay', () => {
  it('40 % of the 24-month average', () => {
    expect(val(childcarePay(500000))).toEqual({
      average: 450000,
      byIncome: 180000,
      min: 27680,
      max: 238000,
      amount: 180000,
      opv: 18000,
      net: 162000,
      limit: undefined,
    })
    expect(val(childcarePay(500000, { months: 12 })).amount).toBe(90000)
  })

  it('floor: the care allowance by birth order is left after ОПВ', () => {
    const v = val(childcarePay(0))
    expect(v).toMatchObject({ amount: 27680, opv: 2768, net: 24912, limit: 'min' })
    expect(val(childcarePay(0, { order: 3 })).net).toBe(33951.25)
    expect(val(childcarePay(0, { order: 7 })).amount).toBe(42769.44)
  })

  it('ceiling: 40 % of 7 MZP', () => {
    expect(val(childcarePay(1000000, { gross: false }))).toMatchObject({
      byIncome: 400000,
      amount: 238000,
      limit: 'max',
    })
  })

  it('errors', () => {
    expect(childcarePay(1, { order: 0 })).toEqual({ ok: false, error: 'range' })
    expect(childcarePay(1, { order: 1.5 })).toEqual({ ok: false, error: 'range' })
    expect(childcarePay('1,5,')).toEqual({ ok: false, error: 'invalid' })
  })

  it('property: net = amount − 10 %, amount within the floor and the ceiling', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1e8 }),
        fc.integer({ min: 1, max: 6 }),
        (income, order) => {
          const v = val(childcarePay(income, { order }))
          expect(v.amount).toBeGreaterThanOrEqual(v.min)
          expect(v.amount).toBeLessThanOrEqual(v.max)
          expect(v.net).toBeCloseTo(v.amount - v.opv, 2)
        },
      ),
    )
  })
})

describe('budget allowances', () => {
  it('birth: 38 MRP, 63 from the 4th child; care: 5.76 … 8.90 MRP', () => {
    expect(val(birthAllowance(1))).toBe(164350)
    expect(val(birthAllowance(4))).toBe(272475)
    expect(val(careAllowance(1))).toBe(24912)
    expect(val(careAllowance(2))).toBe(29453.25)
    expect(val(careAllowance(9))).toBe(38492.5)
    expect(birthAllowance(0)).toEqual({ ok: false, error: 'range' })
    expect(careAllowance(1, { year: 2020 })).toEqual({ ok: false, error: 'data' })
  })
})
