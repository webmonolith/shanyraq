import { type DateInput, dayNumber, toDay } from '../core/date'
import type { CustomsError } from '../core/errors'
import { daysInMonth } from '../core/id'
import { err, ok, type Result } from '../core/result'
import { PERSONAL_CAR } from './generated'

export interface PersonalCarOptions {
  /** Engine volume, cc. */
  volume: number | string
  /** Date of manufacture. */
  made: DateInput
  /** Day the passenger customs declaration is registered. */
  declared: DateInput
  /** Tenge per euro on the declaration day. */
  eur: number | string
}

/** Age group of decision No. 107: up to 3 years, over 3 up to 5, over 5. */
export type CarAgeGroup = 'upTo3' | 'upTo5' | 'over5'

export interface PersonalCarDuty {
  /** Full years since manufacture. */
  age: number
  group: CarAgeGroup
  /** Percent of the value; up to 3 years only. */
  percent?: number
  /** Euro per cc: the minimum up to 3 years, the rate after. */
  perCc: number
  /** Percent of the value, euro; up to 3 years only. */
  byValue?: number
  /** Volume × `perCc`, euro. */
  byVolume: number
  /** The larger of the two, euro. */
  euro: number
  /** In tenge, rounded to tiyn. */
  duty: number
}

const MAX = 1e12

const number = (input: number | string): number => {
  if (typeof input === 'number') return input
  const s = input.replace(/[\s ]/g, '')
  return /^\d+(?:[.,]\d+)?$/.test(s) ? Number(s.replace(',', '.')) : Number.NaN
}

const addMonths = (day: number, months: number): number => {
  const d = new Date(day * 864e5)
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months
  const year = Math.floor(total / 12)
  const month = (total % 12) + 1
  return dayNumber(year, month, Math.min(d.getUTCDate(), daysInMonth(year, month))) as number
}

const tiyn = (n: number) => Math.round(n * 100) / 100

/**
 * Single customs payment for a car imported by an individual for personal use (EEC Council decision No. 107,
 * annex 2, table 2, item 3): replaces duty, VAT and excise. Not for electric cars and motorcycles.
 * @example
 * personalCarDuty(20000, { volume: 1998, made: '2024-05-01', declared: '2026-10-23', eur: 500 }).value
 * // { age: 2, group: 'upTo3', percent: 48, perCc: 5.5, byValue: 9600, byVolume: 10989, euro: 10989, duty: 5494500 }
 */
export const personalCarDuty = (
  value: number | string,
  options: PersonalCarOptions,
): Result<PersonalCarDuty, CustomsError> => {
  const v = number(value)
  const volume = number(options.volume)
  const eur = number(options.eur)
  if (![v, volume, eur].every(Number.isFinite)) return err('invalid')
  if (v < 0 || v > MAX || !Number.isInteger(volume) || volume < 1 || volume > 30000)
    return err('range')
  if (eur <= 0 || eur > 1e6) return err('range')
  const made = toDay(options.made)
  const declared = toDay(options.declared)
  if (made === undefined || declared === undefined) return err('date')
  if (made > declared) return err('range')
  let age = 0
  while (addMonths(made, (age + 1) * 12) <= declared) age++
  const group: CarAgeGroup =
    declared <= addMonths(made, 36) ? 'upTo3' : declared <= addMonths(made, 60) ? 'upTo5' : 'over5'
  let result: Omit<PersonalCarDuty, 'duty'>
  if (group === 'upTo3') {
    const [, percent, perCc] = PERSONAL_CAR.upTo3.find(([max]) => v <= max) as readonly number[]
    const byValue = tiyn((v * (percent as number)) / 100)
    const byVolume = tiyn(volume * (perCc as number))
    result = {
      age,
      group,
      percent: percent as number,
      perCc: perCc as number,
      byValue,
      byVolume,
      euro: Math.max(byValue, byVolume),
    }
  } else {
    const [, perCc] = PERSONAL_CAR[group].find(([max]) => volume <= max) as readonly number[]
    const byVolume = tiyn(volume * (perCc as number))
    result = { age, group, perCc: perCc as number, byVolume, euro: byVolume }
  }
  return ok({ ...result, duty: tiyn(result.euro * eur) })
}
