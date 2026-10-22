import { type DateInput, dayNumber, isoDate, toDay, weekday, yearOf } from '../core/date'
import type { CalendarError } from '../core/errors'
import { err, ok, type Result } from '../core/result'
import { HOLIDAYS, KURBAN_AIT, TRANSFERS } from './generated'
import type { CalendarOptions, DayOff, Holiday } from './types'

interface Year {
  off: Map<number, DayOff>
  /** Weekend days turned into working days by transfers. */
  working: Set<number>
  complete: boolean
}

const isWeekend = (day: number): boolean => weekday(day) % 6 === 0

const isOff = (y: Year, day: number): boolean =>
  y.off.has(day) || (isWeekend(day) && !y.working.has(day))

const buildYear = (year: number, options: CalendarOptions): Year => {
  const data = options.years?.[year]
  const kurbanAit = data?.kurbanAit ?? KURBAN_AIT[year]
  const transfers = data?.transfers?.map((t): [string, string] => [t.from, t.to]) ?? TRANSFERS[year]
  const holidays: [day: number, holiday: Holiday, shift: boolean][] = []
  for (const [id, month, date, days, type, shift, since, until, ru, kk, en] of HOLIDAYS) {
    const start = date
      ? dayNumber(year, month, date)
      : kurbanAit === undefined
        ? undefined
        : toDay(kurbanAit)
    if (start === undefined) continue
    const holiday: Holiday = { id, type, name: { ru, kk, en } }
    for (let day = start; day < start + days; day++) {
      const iso = isoDate(day)
      if ((!since || iso >= since) && (!until || iso <= until))
        holidays.push([day, holiday, shift === 1])
    }
  }
  holidays.sort((a, b) => a[0] - b[0])
  const y: Year = { off: new Map(), working: new Set(), complete: !!kurbanAit && !!transfers }
  for (const [day, holiday] of holidays)
    y.off.set(day, { date: isoDate(day), kind: 'holiday', holiday })
  for (const [from, to] of transfers ?? []) {
    const f = toDay(from)
    const t = toDay(to)
    if (f === undefined || t === undefined) continue
    y.working.add(f)
    y.off.set(t, { date: to, kind: 'transfer', from })
  }
  // Holidays law art. 5: a holiday on a weekend gives the next working day off.
  for (const [day, holiday, shift] of holidays) {
    if (!shift || !isWeekend(day)) continue
    let next = day + 1
    while (isOff(y, next)) next++
    y.off.set(next, { date: isoDate(next), kind: 'shift', holiday })
  }
  return y
}

const lookup = (options: CalendarOptions) => {
  const cache = new Map<number, Year>()
  return (day: number): Year | CalendarError => {
    const year = yearOf(day)
    if (year < 1000 || year > 9999) return 'range'
    let y = cache.get(year)
    if (!y) {
      y = buildYear(year, options)
      cache.set(year, y)
    }
    return options.strict && !y.complete ? 'data' : y
  }
}

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
  let n = 0
  for (let day = a; day <= b; day++) {
    const y = get(day)
    if (typeof y === 'string') return err(y)
    if (!isOff(y, day)) n++
  }
  return ok(n)
}
