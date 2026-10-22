import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Result } from '../src/core/result'
import {
  addVAT,
  calculateSalary,
  extractVAT,
  getTaxYear,
  grossFromNet,
  MAX_SALARY,
  mrpToTenge,
  type Salary,
  type SalaryOptions,
  TAX_YEARS,
  vatThreshold,
} from '../src/tax'

const val = <T>(r: Result<T, string>): T => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}

const calc = (gross: number | string, options: SalaryOptions = {}): Salary => {
  const r = calculateSalary(gross, options)
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe('getTaxYear', () => {
  it('2026 from the budget law', () => {
    expect(getTaxYear(2026)).toEqual({ year: 2026, mrp: 4325, mzp: 85000 })
    expect(getTaxYear()).toEqual(getTaxYear(2026))
    expect(TAX_YEARS).toContain(2026)
  })

  it('no data → undefined', () => {
    expect(getTaxYear(2019)).toBeUndefined()
  })
})

describe('calculateSalary', () => {
  it('500 000 ₸', () => {
    expect(calc(500000)).toEqual({
      gross: 500000,
      opv: 50000,
      vosms: 10000,
      baseDeduction: 129750,
      taxable: 310250,
      ipn: 31025,
      net: 408975,
      opvr: 17500,
      so: 22500,
      oosms: 15000,
      sn: 26400,
      employerCost: 581400,
    })
  })

  it('minimum wage: no income tax after the base deduction', () => {
    expect(calc(85000)).toMatchObject({
      opv: 8500,
      vosms: 1700,
      taxable: 0,
      ipn: 0,
      net: 74800,
      opvr: 2975,
      so: 4250,
      oosms: 2550,
      sn: 4488,
    })
  })

  it('part-time below MZP: ОПВР and СО from MZP, СН from 14 MRP', () => {
    expect(calc(40000)).toMatchObject({ opv: 4000, vosms: 800, opvr: 2975, so: 4250, sn: 3345 })
  })

  it('caps: ОПВ 50 МЗП, ВОСМС 20, ООСМС 40, СО 7, ОПВР 50', () => {
    expect(calc(5_000_000)).toMatchObject({
      opv: 425000,
      vosms: 34000,
      taxable: 4411250,
      ipn: 441125,
      opvr: 148750,
      so: 29750,
      oosms: 102000,
      sn: 272460,
    })
  })

  it('15 % applies from the month cumulative income passes 8 500 MRP', () => {
    expect(calc(5_000_000, { month: 8 }).ipn).toBe(441125)
    expect(calc(5_000_000, { month: 9 }).ipn).toBe(588063)
    expect(calc(5_000_000, { month: 10 }).ipn).toBe(661687)
  })

  it('without the base deduction', () => {
    expect(calc(500000, { baseDeduction: false })).toMatchObject({
      baseDeduction: 0,
      taxable: 440000,
      ipn: 44000,
      net: 396000,
    })
  })

  it('zero salary pays nothing', () => {
    expect(calc(0)).toMatchObject({ net: 0, opvr: 0, so: 0, oosms: 0, sn: 0, employerCost: 0 })
  })

  it('tolerant strings, rounded to tenge', () => {
    expect(calc('500 000').net).toBe(408975)
    expect(calc('499999,6').gross).toBe(500000)
  })

  it.each([
    [Number.NaN, {}, 'invalid'],
    ['abc', {}, 'invalid'],
    ['1e5', {}, 'invalid'],
    [-1, {}, 'range'],
    [MAX_SALARY + 1, {}, 'range'],
    [100000, { month: 0 }, 'range'],
    [100000, { month: 13 }, 'range'],
    [100000, { month: 1.5 }, 'range'],
    [100000, { year: 2019 }, 'data'],
  ])('%s %o → %s', (gross, options, error) => {
    expect(calculateSalary(gross, options)).toEqual({ ok: false, error })
  })

  it('net never exceeds gross, employer cost never below it', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50_000_000 }),
        fc.integer({ min: 1, max: 12 }),
        (g, month) => {
          const s = calc(g, { month })
          expect(s.net).toBeLessThanOrEqual(g)
          expect(s.net).toBeGreaterThanOrEqual(g * 0.7)
          expect(s.employerCost).toBeGreaterThanOrEqual(g)
          expect(s.ipn).toBeGreaterThanOrEqual(0)
        },
      ),
    )
  })
})

describe('grossFromNet', () => {
  it('inverts calculateSalary', () => {
    expect(val(grossFromNet(408975)).gross).toBe(500000)
    expect(val(grossFromNet(74800)).gross).toBe(85000)
    expect(val(grossFromNet(0)).gross).toBe(0)
  })

  it('smallest gross reaching the net', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20_000_000 }),
        fc.integer({ min: 1, max: 12 }),
        (net, month) => {
          const r = grossFromNet(net, { month })
          if (!r.ok) throw new Error(r.error)
          expect(r.value.net).toBeGreaterThanOrEqual(net)
          expect(calc(r.value.gross - 1, { month }).net).toBeLessThan(net)
        },
      ),
    )
  })

  it('errors', () => {
    expect(grossFromNet('x')).toEqual({ ok: false, error: 'invalid' })
    expect(grossFromNet(1000, { year: 2019 })).toEqual({ ok: false, error: 'data' })
  })
})

describe('VAT', () => {
  it('16 % by default', () => {
    expect(val(addVAT(1000))).toEqual({ net: 1000, vat: 160, gross: 1160 })
    expect(val(extractVAT(1160))).toEqual({ net: 1000, vat: 160, gross: 1160 })
  })

  it('other rates and tiyn', () => {
    expect(val(addVAT('999,99', { rate: 10 }))).toEqual({ net: 999.99, vat: 100, gross: 1099.99 })
    expect(val(extractVAT(100, { rate: 5 }))).toEqual({ net: 95.24, vat: 4.76, gross: 100 })
    expect(val(addVAT(100, { rate: 0 }))).toEqual({ net: 100, vat: 0, gross: 100 })
  })

  it('errors', () => {
    expect(addVAT(100, { rate: -1 })).toEqual({ ok: false, error: 'range' })
    expect(extractVAT(100, { rate: Number.NaN })).toEqual({ ok: false, error: 'range' })
    expect(addVAT(-5)).toEqual({ ok: false, error: 'range' })
    expect(extractVAT('')).toEqual({ ok: false, error: 'invalid' })
  })

  it('add then extract gives the amount back', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1e9 }), fc.constantFrom(0, 5, 10, 16), (n, rate) => {
        const added = val(addVAT(n, { rate }))
        expect(val(extractVAT(added.gross, { rate })).net).toBeCloseTo(n, 1)
      }),
    )
  })

  it('registration threshold is 10 000 MRP', () => {
    expect(vatThreshold()).toBe(43_250_000)
    expect(vatThreshold(2019)).toBeUndefined()
  })
})

describe('mrpToTenge', () => {
  it('converts', () => {
    expect(val(mrpToTenge(10))).toBe(43250)
    expect(val(mrpToTenge('0,5'))).toBe(2162.5)
    expect(mrpToTenge(1, 2019)).toEqual({ ok: false, error: 'data' })
    expect(mrpToTenge(-1)).toEqual({ ok: false, error: 'range' })
  })
})
