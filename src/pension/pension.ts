import { type DateInput, dayNumber, isoDate, toDay } from '../core/date'
import type { PensionError } from '../core/errors'
import { daysInMonth } from '../core/id'
import type { YearOption } from '../core/options'
import { err, ok, type Result } from '../core/result'
import type { Gender } from '../iin/iin'
import { AGE, BASIC, CONTRIBUTIONS, SOLIDARY, YEARS } from './generated'

/** Early retirement (Social Code art. 207 p. 2–3): Semipalatinsk test site zones; women with 5+ children. */
export type EarlyRetirement = 'semipalatinsk' | 'mother5'

export interface RetirementAge {
  /** Years, e.g. 61.5. */
  age: number
  /** Day the age is reached, `YYYY-MM-DD`. */
  date: string
}

export interface BasicPension {
  /** Percent of the subsistence minimum. */
  percent: number
  /** Monthly, tenge. */
  amount: number
}

export interface AgePension {
  /** Average monthly income after the 55 MRP cap (art. 211). */
  income: number
  /** Percent of `income` for the full pension: 60 + 1 per year over the required work record, ≤ 75. */
  percent: number
  /** Full pension, at least the minimum pension. */
  full: number
  /** Share of the full pension: 1, or record before 1998 / required record (art. 210 p. 7); 0 under 6 months. */
  ratio: number
  /** Monthly, tenge. */
  amount: number
}

export interface PensionContributions {
  months: number
  /** ОПВ, 10 % of income (art. 249). */
  opv: number
  /** ОПВР paid by the employer (art. 251). */
  opvr: number
  /** `savings` + ОПВ + ОПВР, without investment income. */
  total: number
}

const LATEST = Math.max(...Object.keys(YEARS).map(Number))
const MAX = 1e12

const addMonths = (day: number, months: number): number | undefined => {
  const d = new Date(day * 864e5)
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months
  const year = Math.floor(total / 12)
  const month = (total % 12) + 1
  return dayNumber(year, month, Math.min(d.getUTCDate(), daysInMonth(year, month)))
}

const money = (input: number | string): number => {
  const s = typeof input === 'number' ? '' : input.replace(/[\s ]/g, '')
  return typeof input === 'number'
    ? input
    : /^\d+(?:[.,]\d+)?$/.test(s)
      ? Number(s.replace(',', '.'))
      : Number.NaN
}

const years = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100

/**
 * Retirement age and the day it is reached (Social Code art. 207): men 63, women 61 → 63 by 2031.
 * @example
 * retirementAge('1967-01-15', 'female').value // { age: 61.5, date: '2028-07-15' }
 */
export const retirementAge = (
  birth: DateInput,
  gender: Gender,
  early?: EarlyRetirement,
): Result<RetirementAge, PensionError> => {
  const born = toDay(birth)
  if (born === undefined) return err('date')
  if (gender !== 'male' && gender !== 'female') return err('range')
  const at = (age: number) => addMonths(born, Math.round(age * 12))
  const reached = (age: number): Result<RetirementAge, PensionError> => {
    const day = at(age)
    return day === undefined ? err('range') : ok({ age, date: isoDate(day) })
  }
  if (early) {
    const rule = AGE.early[early] as { men?: number; women?: number } | undefined
    const age = gender === 'male' ? rule?.men : rule?.women
    return age === undefined ? err('range') : reached(age)
  }
  if (gender === 'male') return reached(AGE.men)
  const rules = AGE.women
  for (let i = 0; i < rules.length; i++) {
    const [from, age] = rules[i] as readonly [string, number]
    const next = rules[i + 1]
    const day = at(age)
    if (day === undefined) return err('range')
    // The age applies on the day it is reached: the first rule whose day falls in its own period.
    if ((!next || day < (toDay(next[0]) as number)) && (i === 0 || day >= (toDay(from) as number)))
      return ok({ age, date: isoDate(day) })
  }
  return err('range')
}

/**
 * State basic pension (art. 206): 70 % of the subsistence minimum, +2 % per full year of participation over 10, ≤ 118 % in 2026.
 * @example
 * basicPension(30).value // { percent: 110, amount: 55936 }
 */
export const basicPension = (
  record: number,
  { year = LATEST }: YearOption = {},
): Result<BasicPension, PensionError> => {
  if (!years(record)) return err('range')
  const y = YEARS[year]
  const rule = [...BASIC.rules].reverse().find((r) => r.from <= year)
  if (!y || !rule) return err('data')
  const percent = Math.min(
    rule.max,
    rule.base + rule.step * Math.max(0, Math.floor(record) - BASIC.freeYears),
  )
  return ok({ percent, amount: Math.round((y.pm * percent) / 100) })
}

/**
 * Solidary age pension (art. 210–211) for work record before 1998: 60 % of the best 3-year average income (≤ 55 MRP).
 * @example
 * agePension(300000, 12, 'female').value // { income: 237875, percent: 60, full: 142725, ratio: 0.6, amount: 85635 }
 */
export const agePension = (
  income: number | string,
  record1998: number,
  gender: Gender,
  { year = LATEST }: YearOption = {},
): Result<AgePension, PensionError> => {
  const i = money(income)
  if (!Number.isFinite(i)) return err('invalid')
  if (i < 0 || i > MAX || !years(record1998) || (gender !== 'male' && gender !== 'female'))
    return err('range')
  const y = YEARS[year]
  if (!y) return err('data')
  const required = SOLIDARY.fullYears[gender === 'male' ? 'men' : 'women']
  const capped = Math.min(i, SOLIDARY.incomeCapMrp * y.mrp)
  const over = Math.max(0, Math.floor(record1998 - required))
  const percent = Math.min(SOLIDARY.maxPercent, SOLIDARY.percent + SOLIDARY.stepPercent * over)
  const full = Math.max(Math.round((capped * percent) / 100), y.minPension)
  const ratio =
    record1998 >= required
      ? 1
      : record1998 >= SOLIDARY.minPartialYears
        ? Math.round((record1998 / required) * 1e4) / 1e4
        : 0
  return ok({ income: capped, percent, full, ratio, amount: Math.round(full * ratio) })
}

/**
 * ОПВ and ОПВР paid from the month after `from` to the month of `to` at a constant income (art. 249, 251); no investment income.
 * @example
 * pensionContributions(400000, '2026-10-23', '2046-10-23').value // { months: 240, opv: 9600000, opvr: 4764000, total: 14364000 }
 */
export const pensionContributions = (
  income: number | string,
  from: DateInput,
  to: DateInput,
  options: { employee?: boolean; savings?: number | string } = {},
): Result<PensionContributions, PensionError> => {
  const i = money(income)
  const savings = money(options.savings ?? 0)
  if (!Number.isFinite(i) || !Number.isFinite(savings)) return err('invalid')
  if (i < 0 || i > MAX || savings < 0 || savings > MAX) return err('range')
  const a = toDay(from)
  const b = toDay(to)
  if (a === undefined || b === undefined) return err('date')
  const y = YEARS[LATEST] as (typeof YEARS)[number]
  const start = new Date(a * 864e5)
  const end = new Date(b * 864e5)
  const first = start.getUTCFullYear() * 12 + start.getUTCMonth() + 1
  const last = end.getUTCFullYear() * 12 + end.getUTCMonth()
  if (last - first > 1200) return err('range')
  const base = Math.min(i, CONTRIBUTIONS.maxMzp * y.mzp)
  const rates = Object.entries(CONTRIBUTIONS.opvr).map(([k, v]) => [Number(k), v] as const)
  let opv = 0
  let opvr = 0
  for (let m = first; m <= last; m++) {
    const year = Math.floor(m / 12)
    opv += (base * CONTRIBUTIONS.opv) / 100
    if (options.employee !== false && i > 0) {
      const rate = [...rates].reverse().find(([k]) => k <= year)?.[1] ?? 0
      opvr += (Math.max(base, CONTRIBUTIONS.opvrMinMzp * y.mzp) * rate) / 100
    }
  }
  const tiyn = (n: number) => Math.round(n * 100) / 100
  const months = Math.max(0, last - first + 1)
  return ok({
    months,
    opv: tiyn(opv),
    opvr: tiyn(opvr),
    total: tiyn(savings + opv + opvr),
  })
}
