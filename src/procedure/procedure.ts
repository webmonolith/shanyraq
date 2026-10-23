import { isOff, lookup, nextWorkingDay } from '../calendar/days'
import type { CalendarOptions } from '../calendar/types'
import { type DateInput, dayNumber, isoDate, toDay } from '../core/date'
import type { CalendarError } from '../core/errors'
import { daysInMonth } from '../core/id'
import { err, ok, type Result } from '../core/result'
import { PERIODS } from './generated'

/** Use exactly one unit. */
export interface ProcedurePeriod {
  years?: number
  months?: number
  days?: number
  workingDays?: number
}

/** Deadlines of the Civil Procedure Code: see `data/procedure.json` for articles. */
export type ProcedureDeadline = keyof typeof PERIODS

export interface ProcedureTerm {
  /** First day of the period: the day after the event (Civil Procedure Code art. 122 p. 2). */
  start: string
  /** Last day of the period itself (art. 123 p. 1–3). */
  due: string
  /** `due`, or the next working day when `due` is a day off (art. 123 p. 4). */
  end: string
  moved: boolean
}

const MAX = 1200

/**
 * End of a procedural term counted from an event, by Civil Procedure Code art. 122–123.
 * @example
 * procedureTerm('2026-01-31', 'appeal').value // { start: '2026-02-01', due: '2026-02-28', end: '2026-03-02', moved: true }
 */
export const procedureTerm = (
  event: DateInput,
  period: ProcedurePeriod | ProcedureDeadline,
  options: CalendarOptions = {},
): Result<ProcedureTerm, CalendarError> => {
  const from = toDay(event)
  if (from === undefined) return err('date')
  const p: ProcedurePeriod = typeof period === 'string' ? (PERIODS[period] ?? {}) : period
  const units = [p.years, p.months, p.days, p.workingDays].filter((v) => v !== undefined)
  const n = units[0] as number
  if (units.length !== 1 || !Number.isInteger(n) || n < 1 || n > MAX) return err('range')
  const get = lookup(options)
  let due: number
  if (p.workingDays) {
    due = from
    for (let left = n; left > 0; ) {
      due++
      const y = get(due)
      if (typeof y === 'string') return err(y)
      if (!isOff(y, due)) left--
    }
  } else if (p.days) {
    due = from + n
  } else {
    const d = new Date(from * 864e5)
    const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + (p.years ? n * 12 : n)
    const year = Math.floor(total / 12)
    const month = (total % 12) + 1
    const day = dayNumber(year, month, Math.min(d.getUTCDate(), daysInMonth(year, month)))
    if (day === undefined) return err('range')
    due = day
  }
  const end = nextWorkingDay(due, get)
  if (typeof end === 'string') return err(end)
  return ok({ start: isoDate(from + 1), due: isoDate(due), end: isoDate(end), moved: end !== due })
}
