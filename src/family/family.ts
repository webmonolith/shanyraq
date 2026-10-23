import type { FamilyError } from '../core/errors'
import type { YearOption } from '../core/options'
import { err, ok, type Result } from '../core/result'
import { RATES as R } from '../tax/generated'
import { getTaxYear, MAX_SALARY } from '../tax/tax'
import { FAMILY } from './generated'

export interface FamilyOptions {
  /** `income` is gross salary: the base is salary − ОПВ within 1–7 MZP (Social Code art. 245). Default `true`; `false` — `income` already is that base, summed over all payers (not capped). */
  gross?: boolean
  /** Months with social contributions among the last 12 (maternity) or 24 (childcare); the rest count as zero. Default — all. */
  months?: number
  /** Year of MRP and MZP; default — the latest year in the data. */
  year?: number
}

export type MaternityLeave = keyof typeof FAMILY.leave

export interface MaternityOptions extends FamilyOptions {
  /** Leave length by Labour Code art. 99 p. 2; default `normal` (126 days). */
  leave?: MaternityLeave
  /** Days on the sick-leave sheet instead of `leave` (adoption, leave after birth only). */
  days?: number
}

export interface MaternityPay {
  /** Average monthly income the social contributions were paid on. */
  average: number
  days: number
  /** Days / 30. */
  coefficient: number
  /** Before the 10 % pension contribution. */
  amount: number
  opv: number
  net: number
}

export interface ChildcareOptions extends FamilyOptions {
  /** Birth order of the child: 1, 2, 3, 4 and more. Default 1. */
  order?: number
}

export interface ChildcarePay {
  average: number
  /** 40 % of `average`. */
  byIncome: number
  /** Floor: the care allowance of art. 82 left after the pension contribution. */
  min: number
  /** Ceiling: 40 % of 7 MZP. */
  max: number
  /** Monthly, before the 10 % pension contribution. */
  amount: number
  opv: number
  net: number
  limit: 'min' | 'max' | undefined
}

const tiyn = (n: number) => Math.round(n * 100) / 100

const amount = (input: number | string): Result<number, FamilyError> => {
  const s = typeof input === 'string' ? input.replace(/[\s ]/g, '') : ''
  const n =
    typeof input === 'number'
      ? input
      : /^\d+(?:[.,]\d+)?$/.test(s)
        ? Number(s.replace(',', '.'))
        : Number.NaN
  if (!Number.isFinite(n)) return err('invalid')
  return n < 0 || n > MAX_SALARY ? err('range') : ok(n)
}

const average = (
  income: number | string,
  options: FamilyOptions,
  period: number,
): Result<{ average: number; mrp: number; mzp: number }, FamilyError> => {
  const { gross = true, months = period } = options
  const i = amount(income)
  if (!i.ok) return i
  if (!Number.isInteger(months) || months < 0 || months > period) return err('range')
  const y = getTaxYear(options.year)
  if (!y) return err('data')
  const { mzp } = y
  const base = i.value - Math.min(i.value * R.opv, R.opvMaxMzp * mzp)
  const object = !gross
    ? i.value
    : i.value && Math.min(Math.max(base, R.soMinMzp * mzp), R.soMaxMzp * mzp)
  return ok({ average: tiyn((object * months) / period), mrp: y.mrp, mzp })
}

const order = (n: number) => (Number.isInteger(n) && n >= 1 ? Math.min(n, 4) - 1 : -1)

/**
 * Social payment for maternity leave from the State Social Insurance Fund (Social Code art. 78).
 * @example
 * maternityPay(500000).value // { average: 450000, days: 126, coefficient: 4.2, amount: 1890000, opv: 189000, net: 1701000 }
 */
export const maternityPay = (
  income: number | string,
  options: MaternityOptions = {},
): Result<MaternityPay, FamilyError> => {
  const days = options.days ?? FAMILY.leave[options.leave ?? 'normal']
  if (!Number.isInteger(days) || days < 1 || days > 366) return err('range')
  const a = average(income, options, FAMILY.maternityMonths)
  if (!a.ok) return a
  const coefficient = days / FAMILY.dayDivisor
  const total = tiyn(a.value.average * coefficient)
  const opv = tiyn(total * FAMILY.opv)
  return ok({
    average: a.value.average,
    days,
    coefficient: Math.round(coefficient * 1e4) / 1e4,
    amount: total,
    opv,
    net: tiyn(total - opv),
  })
}

/**
 * Monthly social payment for childcare until the child is 1.5 years old (Social Code art. 85).
 * @example
 * childcarePay(500000).value // { average: 450000, byIncome: 180000, amount: 180000, opv: 18000, net: 162000, … }
 */
export const childcarePay = (
  income: number | string,
  options: ChildcareOptions = {},
): Result<ChildcarePay, FamilyError> => {
  const i = order(options.order ?? 1)
  if (i < 0) return err('range')
  const a = average(income, options, FAMILY.childcareMonths)
  if (!a.ok) return a
  const { mrp, mzp } = a.value
  const byIncome = tiyn(a.value.average * FAMILY.replacement)
  const min = tiyn(((FAMILY.careMrp[i] as number) * mrp) / (1 - FAMILY.opv))
  const max = tiyn(FAMILY.replacement * FAMILY.childcareMaxMzp * mzp)
  const total = Math.min(Math.max(byIncome, min), max)
  const opv = tiyn(total * FAMILY.opv)
  return ok({
    average: a.value.average,
    byIncome,
    min,
    max,
    amount: total,
    opv,
    net: tiyn(total - opv),
    limit: byIncome < min ? 'min' : byIncome > max ? 'max' : undefined,
  })
}

const allowance = (
  table: readonly number[],
  n: number,
  year?: number,
): Result<number, FamilyError> => {
  const i = order(n)
  if (i < 0) return err('range')
  const y = getTaxYear(year)
  if (!y) return err('data')
  return ok(tiyn((table[i] as number) * y.mrp))
}

/**
 * One-off birth allowance from the budget: 38 MRP for the 1st–3rd child, 63 MRP from the 4th (Social Code art. 80).
 * @example
 * birthAllowance(1).value // 164350
 */
export const birthAllowance = (
  order: number,
  { year }: YearOption = {},
): Result<number, FamilyError> => allowance(FAMILY.birthMrp, order, year)

/**
 * Monthly childcare allowance from the budget for those outside social insurance (Social Code art. 82).
 * @example
 * careAllowance(1).value // 24912
 */
export const careAllowance = (
  order: number,
  { year }: YearOption = {},
): Result<number, FamilyError> => allowance(FAMILY.careMrp, order, year)
