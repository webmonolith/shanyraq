import { countWorkingDays, getDaysOff } from '../calendar/calendar'
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

/**
 * Pay for annual leave: average daily wage × working days inside the leave (Average Wage Rules p. 7–8).
 * `earnings` — salary accrued in the 12 calendar months before the leave month.
 * @example
 * vacationPay(3600000, '2026-07-01', 24).value // { end: '2026-07-25', workingDays: 17, pay: 248780.55, … }
 */
export const vacationPay = (
  earnings: number | string,
  start: DateInput,
  days: number = LEAVE.vacationDays,
  options: LeaveOptions = {},
): Result<VacationPay, LeaveError> => {
  const s = toDay(start)
  if (s === undefined) return err('date')
  if (!Number.isInteger(days) || days < 1 || days > 366) return err('range')
  const a = average(earnings, s, options)
  if (!a.ok) return a
  const [period, dailyWage] = a.value
  const startYear = yearOf(s)
  const off = holidaySet([startYear, startYear + 1, startYear + 2], options.calendar)
  if (!off) return err('range')
  const holidays: string[] = []
  let end = s - 1
  for (let left = days; left > 0; ) {
    end++
    const iso = isoDate(end)
    if (off.has(iso)) holidays.push(iso)
    else left--
  }
  const w = countWorkingDays(isoDate(s), isoDate(end), options.calendar)
  if (!w.ok) return err(w.error === 'data' ? 'data' : 'range')
  return ok({
    start: isoDate(s),
    end: isoDate(end),
    days,
    holidays,
    workingDays: w.value,
    period,
    dailyWage,
    pay: tiyn(dailyWage * w.value),
  })
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
