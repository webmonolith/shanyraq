// Internal: not re-exported from `shanyraq/calendar`.
import { dayNumber, isoDate, toDay, weekday, yearOf } from '../core/date'
import type { CalendarError } from '../core/errors'
import { HOLIDAYS, KURBAN_AIT, TRANSFERS } from './generated'
import type { CalendarOptions, DayOff, Holiday } from './types'

interface Year {
  off: Map<number, DayOff>
  /** Weekend days turned into working days by transfers. */
  working: Set<number>
  complete: boolean
}

export const isWeekend = (day: number): boolean => weekday(day) % 6 === 0

export const isOff = (y: Year, day: number): boolean =>
  y.off.has(day) || (isWeekend(day) && !y.working.has(day))

export const buildYear = (year: number, options: CalendarOptions): Year => {
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

/** Year data built once per call and shared by every day it touches. */
export const lookup = (options: CalendarOptions) => {
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

/** First working day on or after `day`. */
export const nextWorkingDay = (
  day: number,
  get: ReturnType<typeof lookup>,
): number | CalendarError => {
  for (;;) {
    const y = get(day)
    if (typeof y === 'string') return y
    if (!isOff(y, day)) return day
    day++
  }
}
