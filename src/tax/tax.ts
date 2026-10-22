import type { TaxError } from '../core/errors'
import { err, ok, type Result } from '../core/result'
import { RATES as R, YEARS } from './generated'

export interface TaxYear {
  year: number
  /** Monthly calculation index (МРП), tenge. */
  mrp: number
  /** Minimum monthly wage (МЗП), tenge. */
  mzp: number
}

export interface SalaryOptions {
  /** Year of the rates; default — the latest year in the data. */
  year?: number
  /** 1–12: personal income tax is cumulative from January, the same salary is assumed every month. Default 1. */
  month?: number
  /** Base deduction of 30 MRP (Tax Code art. 403); default `true`. */
  baseDeduction?: boolean
}

/** Monthly payroll of a resident employee, whole tenge. */
export interface Salary {
  gross: number
  /** Pension contributions, 10 % (ОПВ). */
  opv: number
  /** Health insurance contributions, 2 % (ВОСМС). */
  vosms: number
  baseDeduction: number
  /** Income the personal income tax is charged on. */
  taxable: number
  /** Personal income tax (ИПН). */
  ipn: number
  /** Paid to the employee. */
  net: number
  /** Employer pension contributions (ОПВР). */
  opvr: number
  /** Social contributions (СО). */
  so: number
  /** Employer health insurance contributions (ООСМС). */
  oosms: number
  /** Social tax (СН). */
  sn: number
  /** Gross plus everything the employer pays on top. */
  employerCost: number
}

export interface VATOptions {
  /** Percent; default 16 (Tax Code art. 503). */
  rate?: number
}

export interface VAT {
  net: number
  vat: number
  gross: number
}

export const MAX_SALARY = 1e12

const LATEST = Math.max(...Object.keys(YEARS).map(Number))

/** Years with complete rate data. */
export const TAX_YEARS: number[] = Object.keys(YEARS).map(Number)

/**
 * MRP and MZP of a year; `undefined` without data.
 * @example
 * getTaxYear(2026) // { year: 2026, mrp: 4325, mzp: 85000 }
 */
export const getTaxYear = (year: number = LATEST): TaxYear | undefined => {
  const y = YEARS[year]
  return y && { year, mrp: y.mrp, mzp: y.mzp }
}

const toNumber = (input: number | string): number =>
  typeof input === 'number'
    ? input
    : /^\d+(?:[.,]\d+)?$/.test(input.replace(/[\s ]/g, ''))
      ? Number(input.replace(/[\s ]/g, '').replace(',', '.'))
      : Number.NaN

const amount = (input: number | string, max: number): Result<number, TaxError> => {
  const n = toNumber(input)
  if (!Number.isFinite(n)) return err('invalid')
  return n < 0 || n > max ? err('range') : ok(n)
}

const round = Math.round
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

const salary = (gross: number, year: number, month: number, deduction: boolean): Salary => {
  const { mrp, mzp, opvr: opvrRate } = YEARS[year] as { mrp: number; mzp: number; opvr: number }
  const opv = round(R.opv * Math.min(gross, R.opvMaxMzp * mzp))
  const vosms = round(R.vosms * Math.min(gross, R.vosmsMaxMzp * mzp))
  const baseDeduction = deduction ? R.baseDeductionMrp * mrp : 0
  const taxable = Math.max(0, gross - opv - vosms - baseDeduction)
  // Tax Code art. 441: tax on income since 1 January minus tax already withheld this year
  const limit = R.ipnThresholdMrp * mrp
  const total = (income: number) =>
    round(R.ipn * Math.min(income, limit) + R.ipnHigh * Math.max(0, income - limit))
  const ipn = total(taxable * month) - total(taxable * (month - 1))
  const paid = gross > 0
  const opvr = paid ? round(opvrRate * clamp(gross, R.opvrMinMzp * mzp, R.opvrMaxMzp * mzp)) : 0
  const so = paid ? round(R.so * clamp(gross - opv, R.soMinMzp * mzp, R.soMaxMzp * mzp)) : 0
  const oosms = round(R.oosms * Math.min(gross, R.oosmsMaxMzp * mzp))
  const sn = paid ? round(R.sn * (Math.max(gross, R.snMinMrp * mrp) - opv - vosms)) : 0
  return {
    gross,
    opv,
    vosms,
    baseDeduction,
    taxable,
    ipn,
    net: gross - opv - vosms - ipn,
    opvr,
    so,
    oosms,
    sn,
    employerCost: gross + opvr + so + oosms + sn,
  }
}

const settings = (options: SalaryOptions): Result<[number, number, boolean], TaxError> => {
  const { year = LATEST, month = 1, baseDeduction = true } = options
  if (!YEARS[year]) return err('data')
  if (!Number.isInteger(month) || month < 1 || month > 12) return err('range')
  return ok([year, month, baseDeduction])
}

/**
 * Employee deductions and employer payments for a monthly gross salary (general regime, resident, no benefits).
 * @example
 * calculateSalary(500000).value // { opv: 50000, vosms: 10000, ipn: 31025, net: 408975, … }
 */
export const calculateSalary = (
  gross: number | string,
  options: SalaryOptions = {},
): Result<Salary, TaxError> => {
  const g = amount(gross, MAX_SALARY)
  if (!g.ok) return g
  const s = settings(options)
  if (!s.ok) return s
  return ok(salary(round(g.value), ...s.value))
}

/**
 * The smallest gross salary that pays at least `net` to the employee.
 * @example
 * grossFromNet(408975).value?.gross // 500000
 */
export const grossFromNet = (
  net: number | string,
  options: SalaryOptions = {},
): Result<Salary, TaxError> => {
  const n = amount(net, MAX_SALARY)
  if (!n.ok) return n
  const s = settings(options)
  if (!s.ok) return s
  const target = round(n.value)
  // net grows with gross and is never above it, and never below half of it
  let lo = target
  let hi = target * 2 + 1
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (salary(mid, ...s.value).net < target) lo = mid + 1
    else hi = mid
  }
  return ok(salary(lo, ...s.value))
}

const vatRate = (options: VATOptions): Result<number, TaxError> => {
  const rate = options.rate ?? R.vat * 100
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? ok(rate / 100) : err('range')
}

const tiyn = (n: number) => Math.round(n * 100) / 100

/**
 * VAT on top of an amount without VAT; amounts rounded to tiyn.
 * @example
 * addVAT(1000).value // { net: 1000, vat: 160, gross: 1160 }
 */
export const addVAT = (net: number | string, options: VATOptions = {}): Result<VAT, TaxError> => {
  const n = amount(net, MAX_SALARY)
  if (!n.ok) return n
  const r = vatRate(options)
  if (!r.ok) return r
  const vat = tiyn(n.value * r.value)
  return ok({ net: tiyn(n.value), vat, gross: tiyn(n.value + vat) })
}

/**
 * VAT contained in an amount that includes it.
 * @example
 * extractVAT(1160).value // { net: 1000, vat: 160, gross: 1160 }
 */
export const extractVAT = (
  gross: number | string,
  options: VATOptions = {},
): Result<VAT, TaxError> => {
  const g = amount(gross, MAX_SALARY)
  if (!g.ok) return g
  const r = vatRate(options)
  if (!r.ok) return r
  const vat = tiyn((g.value * r.value) / (1 + r.value))
  return ok({ net: tiyn(g.value - vat), vat, gross: tiyn(g.value) })
}

/**
 * A number of MRP in tenge (fines, fees and limits are set in MRP).
 * @example
 * mrpToTenge(10).value // 43250
 */
export const mrpToTenge = (
  count: number | string,
  year: number = LATEST,
): Result<number, TaxError> => {
  const c = amount(count, 1e9)
  if (!c.ok) return c
  const y = YEARS[year]
  return y ? ok(tiyn(c.value * y.mrp)) : err('data')
}

/**
 * VAT registration threshold: annual turnover of 10 000 MRP (Tax Code), tenge.
 * @example
 * vatThreshold() // 43250000
 */
export const vatThreshold = (year: number = LATEST): number | undefined => {
  const y = YEARS[year]
  return y && R.vatThresholdMrp * y.mrp
}
