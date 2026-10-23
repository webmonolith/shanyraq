import { addWorkingDays, countWorkingDays, getDaysOff } from '../calendar/calendar'
import type { CalendarOptions } from '../calendar/types'
import { type DateInput, dayNumber, isoDate, toDay, yearOf } from '../core/date'
import type { LeaveError } from '../core/errors'
import { daysInMonth } from '../core/id'
import { err, ok, type Result } from '../core/result'
import { YEARS } from '../tax/generated'
import { LEAVE } from './generated'

export interface LeaveOptions {
  /**
   * Working days actually worked in the 12 months before the event (Average Wage Rules p. 9);
   * default — every working day of those months by the five-day calendar.
   */
  workedDays?: number
  calendar?: CalendarOptions
}

export interface VacationOptions extends LeaveOptions {
  /** Calendar days of leave; default 24 (Labour Code art. 88). */
  days?: number
}

/** The 12 calendar months before the event month and their working days. */
export interface LeavePeriod {
  from: string
  to: string
  workingDays: number
}

export interface VacationPay {
  start: string
  /** Last day of the leave. */
  end: string
  /** Calendar days of leave; holidays inside it are not counted and extend it (Labour Code art. 90). */
  days: number
  /** Holidays inside the leave. */
  holidays: string[]
  /** Working days of the five-day week inside the leave; these are paid. */
  workingDays: number
  period: LeavePeriod
  /** Average daily wage, tiyn precision. */
  dailyWage: number
  pay: number
}

export interface SickMonth {
  /** `YYYY-MM` */
  month: string
  workingDays: number
  /** 25 MRP of the month's year (Labour Code art. 133). */
  cap: number
  pay: number
}

export interface SickPay {
  from: string
  to: string
  workingDays: number
  period: LeavePeriod
  dailyWage: number
  months: SickMonth[]
  /** True when a monthly cap cut the benefit. */
  capped: boolean
  pay: number
}

const MAX_EARNINGS = 1e13
const tiyn = (n: number) => Math.round(n * 100) / 100

const earningsOf = (input: number | string): Result<number, LeaveError> => {
  const n =
    typeof input === 'number'
      ? input
      : /^\d+(?:[.,]\d+)?$/.test(input.replace(/[\s ]/g, ''))
        ? Number(input.replace(/[\s ]/g, '').replace(',', '.'))
        : Number.NaN
  if (!Number.isFinite(n)) return err('invalid')
  return n < 0 || n > MAX_EARNINGS ? err('range') : ok(n)
}

const monthStart = (year: number, month: number) => dayNumber(year, month, 1) as number

// Average Wage Rules p. 8–9: earnings of the 12 months before the event month / their working days.
const average = (
  earnings: number | string,
  event: number,
  options: LeaveOptions,
): Result<[LeavePeriod, number], LeaveError> => {
  const e = earningsOf(earnings)
  if (!e.ok) return e
  const date = new Date(event * 864e5)
  const total = date.getUTCFullYear() * 12 + date.getUTCMonth() - LEAVE.periodMonths
  const from = dayNumber(Math.floor(total / 12), (total % 12) + 1, 1)
  if (from === undefined) return err('range')
  const to = monthStart(date.getUTCFullYear(), date.getUTCMonth() + 1) - 1
  let workingDays = options.workedDays
  if (workingDays === undefined) {
    const c = countWorkingDays(isoDate(from), isoDate(to), options.calendar)
    if (!c.ok) return err(c.error === 'data' ? 'data' : 'range')
    workingDays = c.value
  } else if (!Number.isInteger(workingDays) || workingDays < 1 || workingDays > 366) {
    return err('range')
  }
  const period = { from: isoDate(from), to: isoDate(to), workingDays }
  return ok([period, tiyn(e.value / workingDays)])
}

const holidaySet = (years: number[], options?: CalendarOptions): Set<string> | undefined => {
  const set = new Set<string>()
  for (const y of years) {
    const r = getDaysOff(y, options)
    if (!r.ok) return undefined
    for (const d of r.value) if (d.kind === 'holiday') set.add(d.date)
  }
  return set
}

type Span = Omit<VacationPay, 'period' | 'dailyWage'>

// Leave of `days` calendar days from `s`; holidays inside it do not count and extend it (art. 90).
const leaveSpan = (
  s: number,
  days: number,
  dailyWage: number,
  calendar?: CalendarOptions,
): Result<Span, LeaveError> => {
  const startYear = yearOf(s)
  const off = holidaySet([startYear, startYear + 1, startYear + 2], calendar)
  if (!off) return err('range')
  const holidays: string[] = []
  let end = s - 1
  for (let left = days; left > 0; ) {
    end++
    const iso = isoDate(end)
    if (off.has(iso)) holidays.push(iso)
    else left--
  }
  const w = countWorkingDays(isoDate(s), isoDate(end), calendar)
  if (!w.ok) return err(w.error === 'data' ? 'data' : 'range')
  return ok({
    start: isoDate(s),
    end: isoDate(end),
    days,
    holidays,
    workingDays: w.value,
    pay: tiyn(dailyWage * w.value),
  })
}

/**
 * Pay for annual leave: average daily wage × working days inside the leave (Average Wage Rules p. 7–8).
 * `earnings` — salary accrued in the 12 calendar months before the leave month.
 * @example
 * vacationPay(3600000, '2026-07-01', { days: 24 }).value // { end: '2026-07-25', workingDays: 17, pay: 248780.55, … }
 */
export const vacationPay = (
  earnings: number | string,
  start: DateInput,
  options: VacationOptions = {},
): Result<VacationPay, LeaveError> => {
  const { days = LEAVE.vacationDays } = options
  const s = toDay(start)
  if (s === undefined) return err('date')
  if (!Number.isInteger(days) || days < 1 || days > 366) return err('range')
  const a = average(earnings, s, options)
  if (!a.ok) return a
  const [period, dailyWage] = a.value
  const l = leaveSpan(s, days, dailyWage, options.calendar)
  return l.ok ? ok({ ...l.value, period, dailyWage }) : l
}

/**
 * Sick-leave benefit paid by the employer: average daily wage × working days of the sick period,
 * at most 25 MRP per calendar month (Labour Code art. 133).
 * @example
 * sickPay(3600000, '2026-03-02', '2026-03-06').value // { workingDays: 5, capped: false, pay: 73469.4, … }
 */
export const sickPay = (
  earnings: number | string,
  from: DateInput,
  to: DateInput,
  options: LeaveOptions = {},
): Result<SickPay, LeaveError> => {
  const f = toDay(from)
  const t = toDay(to)
  if (f === undefined || t === undefined) return err('date')
  if (f > t || t - f > 366) return err('range')
  const a = average(earnings, f, options)
  if (!a.ok) return a
  const [period, dailyWage] = a.value
  const months: SickMonth[] = []
  let capped = false
  for (let day = f; day <= t; ) {
    const d = new Date(day * 864e5)
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth() + 1
    const last = Math.min(t, monthStart(year, month) + daysInMonth(year, month) - 1)
    const mrp = YEARS[year]?.mrp
    if (mrp === undefined) return err('data')
    const w = countWorkingDays(isoDate(day), isoDate(last), options.calendar)
    if (!w.ok) return err(w.error === 'data' ? 'data' : 'range')
    const cap = LEAVE.sickCapMrp * mrp
    const full = tiyn(dailyWage * w.value)
    if (full > cap) capped = true
    months.push({
      month: isoDate(day).slice(0, 7),
      workingDays: w.value,
      cap,
      pay: Math.min(full, cap),
    })
    day = last + 1
  }
  return ok({
    from: isoDate(f),
    to: isoDate(t),
    workingDays: months.reduce((s, m) => s + m.workingDays, 0),
    period,
    dailyWage,
    months,
    capped,
    pay: tiyn(months.reduce((s, m) => s + m.pay, 0)),
  })
}

/** Ground for termination; sets the job-loss payment of Labour Code art. 131. */
export type DismissalReason = 'liquidation' | 'reduction' | 'breach' | 'decline' | 'other'

export interface DismissalOptions extends LeaveOptions {
  /** Calendar days of unused annual leave (Labour Code art. 96). */
  unusedDays?: number
  /** Default `'other'` — no job-loss payment. */
  reason?: DismissalReason
  /** Monthly salary: pays the working days of the last month up to the dismissal day. */
  salary?: number | string
}

export interface DismissalPay {
  /** Last working day (day of termination). */
  end: string
  /** Latest payment day: the third working day after `end` (Labour Code art. 113 p. 4). */
  payBy: string
  period: LeavePeriod
  dailyWage: number
  salary?: { workingDays: number; monthWorkingDays: number; pay: number }
  /** Unused leave counted from the next working day after `end` (Average Wage Rules p. 15). */
  compensation?: Span
  /** Average wage for 1 or 2 months after `end` (art. 131). */
  severance?: { months: number; from: string; to: string; workingDays: number; pay: number }
  pay: number
}

/**
 * Final payout on termination: salary for the last month, unused leave compensation, job-loss payment.
 * `earnings` — salary accrued in the 12 calendar months before the dismissal month.
 * @example
 * dismissalPay(3600000, '2026-06-30', { unusedDays: 12, reason: 'reduction' }).value?.pay // 442623
 */
export const dismissalPay = (
  earnings: number | string,
  end: DateInput,
  options: DismissalOptions = {},
): Result<DismissalPay, LeaveError> => {
  const e = toDay(end)
  if (e === undefined) return err('date')
  const { unusedDays = 0, reason = 'other', salary } = options
  if (!Number.isInteger(unusedDays) || unusedDays < 0 || unusedDays > 366) return err('range')
  const a = average(earnings, e, options)
  if (!a.ok) return a
  const [period, dailyWage] = a.value
  const payBy = addWorkingDays(isoDate(e), LEAVE.payWithinWorkingDays, options.calendar)
  if (!payBy.ok) return err(payBy.error === 'data' ? 'data' : 'range')
  const result: DismissalPay = { end: isoDate(e), payBy: payBy.value, period, dailyWage, pay: 0 }
  const d = new Date(e * 864e5)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  if (salary !== undefined) {
    const s = earningsOf(salary)
    if (!s.ok) return s
    const first = monthStart(y, m)
    const worked = countWorkingDays(isoDate(first), isoDate(e), options.calendar)
    const all = countWorkingDays(
      isoDate(first),
      isoDate(first + daysInMonth(y, m) - 1),
      options.calendar,
    )
    if (!worked.ok) return err(worked.error === 'data' ? 'data' : 'range')
    if (!all.ok) return err(all.error === 'data' ? 'data' : 'range')
    result.salary = {
      workingDays: worked.value,
      monthWorkingDays: all.value,
      pay: all.value ? tiyn((s.value * worked.value) / all.value) : 0,
    }
  }
  if (unusedDays) {
    const first = addWorkingDays(isoDate(e), 1, options.calendar)
    if (!first.ok) return err(first.error === 'data' ? 'data' : 'range')
    const l = leaveSpan(toDay(first.value) as number, unusedDays, dailyWage, options.calendar)
    if (!l.ok) return l
    result.compensation = l.value
  }
  const months = LEAVE.severanceMonths[reason as keyof typeof LEAVE.severanceMonths] ?? 0
  if (months) {
    const day = e + 1
    const n = new Date(day * 864e5)
    const total = n.getUTCFullYear() * 12 + n.getUTCMonth() + months
    const ty = Math.floor(total / 12)
    const tm = (total % 12) + 1
    // no such date in the target month → the period ends on its last day
    const d = n.getUTCDate()
    const dim = daysInMonth(ty, tm)
    const to = d > dim ? (dayNumber(ty, tm, dim) as number) : (dayNumber(ty, tm, d) as number) - 1
    const w = countWorkingDays(isoDate(day), isoDate(to), options.calendar)
    if (!w.ok) return err(w.error === 'data' ? 'data' : 'range')
    result.severance = {
      months,
      from: isoDate(day),
      to: isoDate(to),
      workingDays: w.value,
      pay: tiyn(dailyWage * w.value),
    }
  }
  result.pay = tiyn(
    (result.salary?.pay ?? 0) + (result.compensation?.pay ?? 0) + (result.severance?.pay ?? 0),
  )
  return ok(result)
}
