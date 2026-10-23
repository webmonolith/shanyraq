import { type DateInput, isoDate, toDay } from '../core/date'
import type { ClaimError } from '../core/errors'
import { err, ok, type Result } from '../core/result'
import { getTaxYear, MAX_SALARY } from '../tax/tax'
import { BASE_RATE, DUTY, TAX_PENALTY } from './generated'

export interface BaseRate {
  /** Percent per year. */
  rate: number
  /** Date the rate was set. */
  since: string
  /** The date is after the last known National Bank decision: the rate may have changed. */
  stale: boolean
}

export interface ClaimPayment {
  date: DateInput
  amount: number | string
}

export interface ClaimPenaltyOptions {
  /** Partial payments made after `due`. */
  payments?: ClaimPayment[]
  /** One base-rate date for the whole debt: the day of the claim or of the decision, chosen by the creditor (Civil Code art. 353 p. 1). Default: each part by its payment day, the rest by `until`. */
  rateDate?: DateInput
  /** Own rate, percent per year (contract or law), instead of the base rate. */
  rate?: number
  /** Days in a year. Default 365. */
  basis?: 360 | 365
}

export interface ClaimPart {
  /** Paid part, or the unpaid rest when `paid` is false. */
  amount: number
  paid: boolean
  /** Payment date, or `until` for the rest. */
  date: string
  /** Days from the day after `due` to `date`, inclusive. */
  days: number
  rate: number
  penalty: number
}

export interface ClaimPenalty {
  debt: number
  /** Unpaid on `until`. */
  rest: number
  parts: ClaimPart[]
  penalty: number
  /** `rest` + `penalty` — what can be claimed. */
  total: number
  /** Some base rate is past the last known decision. */
  stale: boolean
}

export interface TaxPenaltyOptions {
  /** Payments made after `due`; each one still accrues on its payment day. */
  payments?: ClaimPayment[]
  /** Horizontal monitoring participant: 0.65 × base rate instead of 1.25 (Tax Code art. 5 subp. 2). */
  monitoring?: boolean
}

export interface TaxPenaltyPart {
  /** First and last day of the stretch with the same debt and base rate. */
  from: string
  to: string
  days: number
  /** Unpaid debt on these days. */
  amount: number
  baseRate: number
  /** Multiplier × base rate, percent per year. */
  rate: number
  penalty: number
}

export interface TaxPenalty {
  debt: number
  /** Unpaid on `until`. */
  rest: number
  /** Days with a penalty. */
  days: number
  parts: TaxPenaltyPart[]
  penalty: number
  /** `rest` + `penalty`. */
  total: number
  /** Some day is past the last known decision. */
  stale: boolean
}

export interface ClaimDutyOptions {
  /** Individual (1 %, ≤ 10 000 MRP) or legal entity (3 %, ≤ 20 000 MRP). Default individual. */
  payer?: 'individual' | 'legal'
  /** Application for a court order: 50 % of the rate (Tax Code art. 665 p. 1 subp. 10). */
  courtOrder?: boolean
  /** Year of the MRP; default — the latest year in the data. */
  year?: number
}

export interface ClaimDuty {
  percent: number
  duty: number
  /** The MRP cap applied. */
  capped: boolean
}

const tiyn = (n: number) => Math.round(n * 100) / 100

const amount = (input: number | string): Result<number, ClaimError> => {
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

const rateOn = (day: number): BaseRate | undefined => {
  const iso = isoDate(day)
  if (iso < BASE_RATE.since) return undefined
  let i = BASE_RATE.changes.length - 1
  while (i > 0 && (BASE_RATE.changes[i] as readonly [string, number])[0] > iso) i--
  const [since, rate] = BASE_RATE.changes[i] as readonly [string, number]
  return { rate, since, stale: iso > BASE_RATE.staleAfter }
}

/**
 * National Bank base rate in force on a date (since 1 April 2017, when the refinancing rate was set equal to it).
 * @example
 * baseRate('2026-10-01') // { rate: 16.25, since: '2026-09-07', stale: false }
 */
export const baseRate = (date: DateInput): BaseRate | undefined => {
  const day = toDay(date)
  return day === undefined ? undefined : rateOn(day)
}

/**
 * Penalty for using someone else's money under Civil Code art. 353: debt × base rate × days overdue / 365.
 * @example
 * claimPenalty(1000000, '2026-01-31', '2026-10-01').value // { rest: 1000000, penalty: 108184.93, total: 1108184.93, … }
 */
export const claimPenalty = (
  debt: number | string,
  due: DateInput,
  until: DateInput,
  options: ClaimPenaltyOptions = {},
): Result<ClaimPenalty, ClaimError> => {
  const { payments = [], basis = 365 } = options
  const d = amount(debt)
  if (!d.ok) return d
  const from = toDay(due)
  const to = toDay(until)
  const fixedDay = options.rateDate === undefined ? undefined : toDay(options.rateDate)
  if (from === undefined || to === undefined) return err('date')
  if (options.rateDate !== undefined && fixedDay === undefined) return err('date')
  if (to < from || (basis !== 365 && basis !== 360)) return err('range')
  if (options.rate !== undefined && !(options.rate >= 0 && options.rate <= 1000))
    return err('range')
  const items: { day: number; amount: number; paid: boolean }[] = []
  let rest = d.value
  for (const p of payments) {
    const day = toDay(p.date)
    if (day === undefined) return err('date')
    const a = amount(p.amount)
    if (!a.ok) return a
    if (day < from || day > to) return err('range')
    rest = tiyn(rest - a.value)
    items.push({ day, amount: a.value, paid: true })
  }
  if (rest < 0) return err('range')
  items.sort((a, b) => a.day - b.day)
  if (rest > 0) items.push({ day: to, amount: rest, paid: false })
  const parts: ClaimPart[] = []
  let stale = false
  for (const item of items) {
    let rate = options.rate
    if (rate === undefined) {
      const r = rateOn(fixedDay ?? item.day)
      if (!r) return err('data')
      rate = r.rate
      stale ||= r.stale
    }
    const days = item.day - from
    parts.push({
      amount: item.amount,
      paid: item.paid,
      date: isoDate(item.day),
      days,
      rate,
      penalty: tiyn((item.amount * rate * days) / 100 / basis),
    })
  }
  const penalty = tiyn(parts.reduce((s, p) => s + p.penalty, 0))
  return ok({ debt: d.value, rest, parts, penalty, total: tiyn(rest + penalty), stale })
}

/**
 * Penalty on late taxes and social payments: debt × 1.25 × base rate of each day / 365, from the day after `due` to the payment day inclusive (Tax Code art. 5 subp. 2).
 * @example
 * taxPenalty(100000, '2026-09-30', '2026-10-10').value // { days: 10, penalty: 556.51, total: 100556.51, … }
 */
export const taxPenalty = (
  debt: number | string,
  due: DateInput,
  until: DateInput,
  options: TaxPenaltyOptions = {},
): Result<TaxPenalty, ClaimError> => {
  const d = amount(debt)
  if (!d.ok) return d
  const from = toDay(due)
  const to = toDay(until)
  if (from === undefined || to === undefined) return err('date')
  if (to < from) return err('range')
  if (from + 1 < (toDay(TAX_PENALTY.since) as number)) return err('data')
  const paid: { day: number; amount: number }[] = []
  let rest = d.value
  for (const p of options.payments ?? []) {
    const day = toDay(p.date)
    if (day === undefined) return err('date')
    const a = amount(p.amount)
    if (!a.ok) return a
    if (day < from || day > to) return err('range')
    rest = tiyn(rest - a.value)
    paid.push({ day, amount: a.value })
  }
  if (rest < 0) return err('range')
  paid.sort((a, b) => a.day - b.day)
  const changes = BASE_RATE.changes.map(([since]) => toDay(since) as number)
  const k = options.monitoring ? TAX_PENALTY.monitoring : TAX_PENALTY.multiplier
  const parts: TaxPenaltyPart[] = []
  let left = d.value
  let i = 0
  let day = from + 1
  let stale = false
  for (;;) {
    while (i < paid.length && (paid[i] as { day: number }).day < day)
      left = tiyn(left - (paid[i++] as { amount: number }).amount)
    if (day > to || left <= 0) break
    let next = to + 1
    if (i < paid.length) next = Math.min(next, (paid[i] as { day: number }).day + 1)
    const change = changes.find((c) => c > day)
    if (change !== undefined) next = Math.min(next, change)
    // TAX_PENALTY.since is after BASE_RATE.since, so every day has a rate.
    const r = rateOn(day) as BaseRate
    const days = next - day
    const rate = Math.round(r.rate * k * 1e4) / 1e4
    stale ||= isoDate(next - 1) > BASE_RATE.staleAfter
    parts.push({
      from: isoDate(day),
      to: isoDate(next - 1),
      days,
      amount: left,
      baseRate: r.rate,
      rate,
      penalty: tiyn((left * rate * days) / 100 / TAX_PENALTY.basis),
    })
    day = next
  }
  const penalty = tiyn(parts.reduce((s, p) => s + p.penalty, 0))
  const days = parts.reduce((s, p) => s + p.days, 0)
  return ok({ debt: d.value, rest, days, parts, penalty, total: tiyn(rest + penalty), stale })
}

/**
 * State duty on a money claim: Tax Code art. 665 p. 1 subp. 1 and 10.
 * @example
 * claimDuty(1108184.93).value // { percent: 1, duty: 11081.85, capped: false }
 */
export const claimDuty = (
  price: number | string,
  options: ClaimDutyOptions = {},
): Result<ClaimDuty, ClaimError> => {
  const { payer = 'individual', courtOrder = false } = options
  const p = amount(price)
  if (!p.ok) return p
  const y = getTaxYear(options.year)
  if (!y) return err('data')
  const rule = DUTY[payer]
  if (!rule) return err('range')
  const share = courtOrder ? DUTY.courtOrderShare / 100 : 1
  const full = (p.value * rule.percent) / 100
  const max = rule.maxMrp * y.mrp
  return ok({
    percent: rule.percent * share,
    duty: tiyn(Math.min(full, max) * share),
    capped: full > max,
  })
}
