import { type DateInput, dayNumber, isoDate, toDay, yearOf } from '../core/date'
import type { CalendarError } from '../core/errors'
import { err, ok, type Result } from '../core/result'
import { buildYear, isOff, isWeekend, lookup } from './days'
import type { CalendarOptions, DayOff } from './types'

/**
 * Days off of a year besides ordinary weekends: holidays (also on weekends), weekend shifts and
 * Labour Ministry transfers. Built-in Kurban ait dates cover 2020–2027, transfers 2024–2027.
 * @example
 * getDaysOff(2026) // { ok: true, value: [{ date: '2026-01-01', kind: 'holiday', holiday: { id: 'new-year', ... } }, ...] }
 */
export const getDaysOff = (
  year: number,
  options: CalendarOptions = {},
): Result<DayOff[], CalendarError> => {
  if (!Number.isInteger(year) || dayNumber(year, 1, 1) === undefined) return err('range')
  const y = lookup(options)(dayNumber(year, 1, 1) as number)
  if (typeof y === 'string') return err(y)
  return ok([...y.off].sort((a, b) => a[0] - b[0]).map(([, d]) => d))
}

/**
 * True for weekends, holidays, shifted and transferred days off; false for invalid dates.
 * @example
 * isDayOff('2026-03-24') // true, Nauryz fell on Saturday–Sunday
 */
export const isDayOff = (date: DateInput, options: CalendarOptions = {}): boolean => {
  const day = toDay(date)
  return day !== undefined && isOff(buildYear(yearOf(day), options), day)
}

/**
 * True for a working day of the five-day week; false for days off and invalid dates.
 * @example
 * isWorkingDay('2024-05-04') // true, a working Saturday (order No. 109)
 */
export const isWorkingDay = (date: DateInput, options: CalendarOptions = {}): boolean => {
  const day = toDay(date)
  return day !== undefined && !isOff(buildYear(yearOf(day), options), day)
}

/**
 * Moves `days` working days forward (negative: back); the start day is not counted.
 * @example
 * addWorkingDays('2026-12-15', 1) // { ok: true, value: '2026-12-17' }
 */
export const addWorkingDays = (
  date: DateInput,
  days: number,
  options: CalendarOptions = {},
): Result<string, CalendarError> => {
  let day = toDay(date)
  if (day === undefined) return err('date')
  if (!Number.isInteger(days)) return err('range')
  const get = lookup(options)
  const step = days < 0 ? -1 : 1
  for (let left = Math.abs(days); left > 0; ) {
    day += step
    const y = get(day)
    if (typeof y === 'string') return err(y)
    if (!isOff(y, day)) left--
  }
  return ok(isoDate(day))
}

/**
 * Working days from `from` to `to`, both inclusive.
 * @example
 * countWorkingDays('2026-03-01', '2026-03-31') // { ok: true, value: 18 }
 */
export const countWorkingDays = (
  from: DateInput,
  to: DateInput,
  options: CalendarOptions = {},
): Result<number, CalendarError> => {
  const a = toDay(from)
  const b = toDay(to)
  if (a === undefined || b === undefined) return err('date')
  if (a > b) return err('range')
  const get = lookup(options)
  const days = b - a + 1
  let n = Math.floor(days / 7) * 5
  for (let day = b - (days % 7) + 1; day <= b; day++) if (!isWeekend(day)) n++
  // Only days of the year itself count, as when each day looks up its own year.
  for (let year = yearOf(a); year <= yearOf(b); year++) {
    const first = dayNumber(year, 1, 1) as number
    const y = get(first)
    if (typeof y === 'string') return err(y)
    const lo = Math.max(a, first)
    const hi = Math.min(b, dayNumber(year, 12, 31) as number)
    for (const day of y.off.keys()) if (day >= lo && day <= hi && !isWeekend(day)) n--
    for (const day of y.working)
      if (day >= lo && day <= hi && isWeekend(day) && !y.off.has(day)) n++
  }
  return ok(n)
}
