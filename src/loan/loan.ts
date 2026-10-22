import { type DateInput, dayNumber, isoDate, toDay } from '../core/date'
import type { LoanError } from '../core/errors'
import { daysInMonth } from '../core/id'
import { err, ok, type Result } from '../core/result'
import { GESV_DECIMALS, LIMITS } from './generated'

export type LoanMethod = 'annuity' | 'differentiated'

export interface Prepayment {
  /** Paid together with regular payment number `month` (1-based). */
  month: number
  amount: number
  /** What shrinks afterwards: the term (default) or the monthly payment. */
  reduce?: 'term' | 'payment'
}

export interface LoanOptions {
  /** Default `annuity`. */
  method?: LoanMethod
  /** Issue date; payments fall on the same day of the following months. */
  start?: DateInput
  /** One-time fee paid to the lender on the issue date (`k` in the ГЭСВ formula). */
  fee?: number
  /** Fee added to every monthly payment. */
  monthlyFee?: number
  prepayments?: Prepayment[]
}

export interface LoanPayment {
  n: number
  /** Present when `start` is given. */
  date?: string
  /** Principal + interest + prepayment + fee. */
  payment: number
  principal: number
  interest: number
  prepayment: number
  fee: number
  /** Debt left after the payment. */
  balance: number
}

export interface Loan {
  payments: LoanPayment[]
  /** First payment without prepayment. */
  monthly: number
  interest: number
  /** One-time and monthly fees. */
  fees: number
  /** Everything the borrower pays. */
  total: number
  /** `total` minus the loan amount. */
  overpayment: number
  /** ГЭСВ (annual effective rate), percent rounded to hundredths (ARDFM rules No. 44, p. 23). */
  apr: number
}

export interface CashFlow {
  /** Days since the loan was issued. */
  days: number
  amount: number
}

export type GesvLoanKind = 'unsecured' | 'secured' | 'mortgage' | 'microcredit' | 'shortMicrocredit'

const MAX_AMOUNT = 1e12
const tiyn = (n: number) => Math.round(n * 100) / 100

const toNumber = (input: number | string): number =>
  typeof input === 'number'
    ? input
    : /^\d+(?:[.,]\d+)?$/.test(input.replace(/[\s ]/g, ''))
      ? Number(input.replace(/[\s ]/g, '').replace(',', '.'))
      : Number.NaN

const nonNegative = (n: number | undefined, max = MAX_AMOUNT) =>
  n === undefined || (Number.isFinite(n) && n >= 0 && n <= max)

const addMonths = (start: number, months: number): number => {
  const d = new Date(start * 864e5)
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months
  const year = Math.floor(total / 12)
  const month = (total % 12) + 1
  return dayNumber(year, month, Math.min(d.getUTCDate(), daysInMonth(year, month))) as number
}

/**
 * ГЭСВ from cash flows: `received` = loan minus fees paid on the issue date, `payments` = everything paid
 * afterwards (ARDFM rules No. 44, p. 11: Σ Pi / (1 + APR)^(ti/365) = D − k). Percent, `decimals` default 2.
 * @example
 * effectiveRate(100000, [{ days: 365, amount: 110000 }]).value // 10
 */
export const effectiveRate = (
  received: number,
  payments: CashFlow[],
  decimals: number = GESV_DECIMALS,
): Result<number, LoanError> => {
  if (!(received > 0 && received <= MAX_AMOUNT) || !payments.length) return err('range')
  if (payments.some((p) => !(p.days >= 0 && nonNegative(p.amount)))) return err('range')
  const value = (x: number) =>
    payments.reduce((s, p) => s + p.amount * (1 + x) ** (-p.days / 365), 0) - received
  let lo = -0.99
  let hi = 1e4
  if (value(lo) < 0 || value(hi) > 0) return err('range')
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (value(mid) > 0) lo = mid
    else hi = mid
  }
  const scale = 10 ** decimals
  return ok(Math.round(lo * 100 * scale + 1e-7) / scale)
}

/**
 * Repayment schedule with prepayments and ГЭСВ. Interest of a month = debt × rate / 12.
 * @example
 * loanSchedule(1000000, 20, 12).value // { monthly: 92634.51, overpayment: 111614.09, apr: 21.94, … }
 */
export const loanSchedule = (
  amount: number | string,
  rate: number,
  months: number,
  options: LoanOptions = {},
): Result<Loan, LoanError> => {
  const principal0 = toNumber(amount)
  if (!Number.isFinite(principal0)) return err('invalid')
  const { method = 'annuity', fee = 0, monthlyFee = 0, prepayments = [] } = options
  if (
    !(principal0 > 0 && principal0 <= MAX_AMOUNT) ||
    !nonNegative(rate, 1000) ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 600 ||
    !nonNegative(fee) ||
    !nonNegative(monthlyFee) ||
    prepayments.some((p) => !(Number.isInteger(p.month) && p.month >= 1 && p.amount > 0))
  )
    return err('range')
  const start = options.start === undefined ? undefined : toDay(options.start)
  if (options.start !== undefined && start === undefined) return err('date')
  const r = rate / 1200
  const level = (debt: number, left: number) =>
    method === 'differentiated'
      ? tiyn(debt / left)
      : tiyn(r ? (debt * r) / (1 - (1 + r) ** -left) : debt / left)
  let balance = principal0
  let step = level(balance, months)
  const payments: LoanPayment[] = []
  for (let n = 1; balance > 0; n++) {
    const interest = tiyn(balance * r)
    let principal = method === 'differentiated' ? step : tiyn(step - interest)
    if (n >= months || principal > balance) principal = balance
    balance = tiyn(balance - principal)
    let prepayment = 0
    let reduce = false
    for (const p of prepayments)
      if (p.month === n) {
        prepayment += p.amount
        reduce ||= p.reduce === 'payment'
      }
    prepayment = Math.min(tiyn(prepayment), balance)
    balance = tiyn(balance - prepayment)
    if (reduce && balance > 0) step = level(balance, months - n)
    payments.push({
      n,
      ...(start === undefined ? {} : { date: isoDate(addMonths(start, n)) }),
      payment: tiyn(principal + interest + prepayment + monthlyFee),
      principal,
      interest,
      prepayment,
      fee: monthlyFee,
      balance,
    })
  }
  const interest = tiyn(payments.reduce((s, p) => s + p.interest, 0))
  const fees = tiyn(fee + monthlyFee * payments.length)
  const total = tiyn(principal0 + interest + fees)
  const apr = effectiveRate(
    principal0 - fee,
    payments.map((p) => ({
      days: start === undefined ? (p.n * 365) / 12 : addMonths(start, p.n) - start,
      amount: p.payment,
    })),
  )
  if (!apr.ok) return apr
  return ok({
    payments,
    monthly: tiyn((payments[0] as LoanPayment).payment - (payments[0] as LoanPayment).prepayment),
    interest,
    fees,
    total,
    overpayment: tiyn(total - principal0),
    apr: apr.value,
  })
}

/**
 * Legal ГЭСВ cap in percent on a date (joint resolution of ARDFM No. 84 and NBRK No. 51 of 2026).
 * Mortgages from 2027 depend on loan-to-value; without `ltv` the higher cap is returned.
 * @example
 * gesvLimit('mortgage', '2027-03-01', 0.6).value // 20
 */
export const gesvLimit = (
  kind: GesvLoanKind,
  date: DateInput,
  ltv?: number,
): Result<number, LoanError> => {
  const day = toDay(date)
  if (day === undefined) return err('date')
  if (ltv !== undefined && !(ltv > 0 && ltv <= 10)) return err('range')
  const iso = isoDate(day)
  const row = LIMITS.find((l) => l.from <= iso && iso <= l.to)
  if (!row) return err('data')
  if (kind !== 'mortgage') return kind in row ? ok(row[kind]) : err('invalid')
  const tier = row.mortgage.find(([max]) => !max || (ltv !== undefined && ltv <= max))
  return ok((tier as number[])[1] as number)
}
