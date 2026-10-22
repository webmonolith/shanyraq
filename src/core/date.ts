import { daysInMonth } from './id'

/** A `Date` (its local calendar day is used) or a `YYYY-MM-DD` string. */
export type DateInput = Date | string

const DAY_MS = 864e5
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

/** Days since 1970-01-01 for a valid date in years 1000–9999, otherwise undefined. */
export const dayNumber = (year: number, month: number, day: number): number | undefined =>
  year >= 1000 &&
  year <= 9999 &&
  month >= 1 &&
  month <= 12 &&
  day >= 1 &&
  day <= daysInMonth(year, month)
    ? Date.UTC(year, month - 1, day) / DAY_MS
    : undefined

export const toDay = (input: DateInput): number | undefined => {
  if (input instanceof Date)
    return dayNumber(input.getFullYear(), input.getMonth() + 1, input.getDate())
  const m = typeof input === 'string' ? ISO.exec(input) : null
  return m ? dayNumber(Number(m[1]), Number(m[2]), Number(m[3])) : undefined
}

export const isoDate = (day: number): string => new Date(day * DAY_MS).toISOString().slice(0, 10)

export const yearOf = (day: number): number => new Date(day * DAY_MS).getUTCFullYear()

/** 0 = Sunday … 6 = Saturday. */
export const weekday = (day: number): number => (((day + 4) % 7) + 7) % 7
