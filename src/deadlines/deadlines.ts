import { getDaysOff } from '../calendar/calendar'
import { lookup, nextWorkingDay } from '../calendar/days'
import type { CalendarOptions } from '../calendar/types'
import { dayNumber, isoDate } from '../core/date'
import type { DeadlinesError } from '../core/errors'
import { daysInMonth } from '../core/id'
import { err, ok, type Result } from '../core/result'
import { RULES } from './generated'
import type { DeadlineTag, Rule, TaxRegime } from './types'

export interface TaxDeadline {
  /** Stable id of the obligation, e.g. `f910` (declaration 910.00) or `vat` (VAT payment). */
  id: string
  /** Tax reporting form number (MinFin order No. 695), for declarations. */
  form?: string
  kind: 'report' | 'pay'
  /** Date set by the law. */
  due: string
  /** Last day after moving off weekends and holidays (Tax Code art. 64 p. 2). */
  date: string
  moved: boolean
  /** Period the declaration or payment is for. */
  period: { from: string; to: string }
  regimes: TaxRegime[]
}

export interface DeadlineOptions {
  /** Only deadlines of this regime. */
  regime?: TaxRegime
  /** Conditions that apply to the payer; deadlines needing other conditions are dropped. Default — no filtering. */
  tags?: DeadlineTag[]
  calendar?: CalendarOptions
}

const day = (y: number, m: number, d: number) => dayNumber(y, m, d) as number
const monthEnd = (y: number, m: number) => day(y, m, daysInMonth(y, m))
// Month index counted from January of year 0 keeps year rollovers in one place.
const ym = (y: number, m: number): [number, number] => [
  Math.floor((y * 12 + m - 1) / 12),
  ((y * 12 + m - 1) % 12) + 1,
]
const range = (y0: number, m0: number, y1: number, m1: number) => ({
  from: isoDate(day(y0, m0, 1)),
  to: isoDate(monthEnd(y1, m1)),
})
const md = (y: number, s: string) => day(y, Number(s.slice(0, 2)), Number(s.slice(3)))

// Every [due day, period] of a rule that falls due in `year`.
const occurrences = ({ rule }: Rule, year: number): [number, TaxDeadline['period']][] => {
  const d = rule.day as number
  const out: [number, TaxDeadline['period']][] = []
  switch (rule.type) {
    case 'monthly':
      for (let m = 1; m <= 12; m++) {
        const [py, pm] = ym(year, m - 1)
        out.push([day(year, m, d), range(py, pm, py, pm)])
      }
      break
    case 'inMonth':
      for (let m = 1; m <= 12; m++) out.push([day(year, m, d), range(year, m, year, m)])
      break
    case 'quarterly':
    case 'halfYear': {
      const len = rule.type === 'quarterly' ? 3 : 6
      for (let m = 2; m <= 12; m += len) {
        const [ey, em] = ym(year, m - 2)
        const [sy, sm] = ym(ey, em - len + 1)
        out.push([day(year, m, d), range(sy, sm, ey, em)])
      }
      break
    }
    case 'annual':
      out.push([
        day(year, rule.month as number, d) + (rule.plusDays ?? 0),
        range(year - 1, 1, year - 1, 12),
      ])
      break
    default:
      for (const f of rule.dates ?? []) {
        const py = year + f.year
        out.push([
          md(year, f.md),
          { from: isoDate(md(py, f.from ?? '01-01')), to: isoDate(md(py, f.to ?? '12-31')) },
        ])
      }
  }
  return out
}

const applies = (r: Rule, options: DeadlineOptions): TaxRegime[] =>
  (Object.keys(r.regimes) as TaxRegime[]).filter(
    (regime) =>
      (!options.regime || options.regime === regime) &&
      (!options.tags ||
        (r.regimes[regime] as string[]).every((t) => options.tags?.includes(t as DeadlineTag))),
  )

/**
 * Filing and payment deadlines falling due in a year, sorted by date; a deadline on a day off moves to
 * the next working day (Tax Code art. 64 p. 2).
 * @example
 * taxDeadlines(2026, { regime: 'simplified', tags: [] }).value // [{ id: 'f910', form: '910.00', due: '2026-02-15', date: '2026-02-16', moved: true, … }, …]
 */
export const taxDeadlines = (
  year: number,
  options: DeadlineOptions = {},
): Result<TaxDeadline[], DeadlinesError> => {
  if (!Number.isInteger(year) || year < 1001 || year > 9998) return err('range')
  const check = getDaysOff(year, options.calendar)
  if (!check.ok) return err('data')
  const get = lookup(options.calendar ?? {})
  const list: TaxDeadline[] = []
  for (const r of RULES) {
    const regimes = applies(r, options)
    if (!regimes.length) continue
    for (const [due, period] of occurrences(r, year)) {
      const next = nextWorkingDay(due, get)
      if (typeof next === 'string') return err('data')
      const date = isoDate(next)
      list.push({
        id: r.id,
        ...(r.form ? { form: r.form } : {}),
        kind: r.kind,
        due: isoDate(due),
        date,
        moved: date !== isoDate(due),
        period,
        regimes,
      })
    }
  }
  return ok(list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)))
}
