import type { VehicleError } from '../core/errors'
import type { YearOption } from '../core/options'
import { own } from '../core/own'
import { err, ok, type Result } from '../core/result'
import { getTaxYear } from '../tax/tax'
import { RECYCLING, REGISTRATION, TAX } from './generated'

export type VehicleKind = 'car' | 'truck' | 'bus' | 'moto' | 'special'

export interface VehicleTaxOptions {
  /** Engine volume, cc (cars). */
  volume?: number
  /** Load capacity, tonnes (trucks). */
  tonnage?: number
  /** Passenger seats (buses). */
  seats?: number
  /** Engine power, kW (motorcycles). */
  kw?: number
  /** Year of manufacture: cars older than 10 years get 0.7, older than 20 — 0.5. */
  made?: number
  /** Tax year; its MRP of 1 January is used. Default — the latest year in the data. */
  year?: number
  /** Months owned in the year, 1–12. Default 12. */
  months?: number
}

export interface VehicleTax {
  /** Rate in MRP. */
  rate: number
  mrp: number
  /** 7 tenge per cc above the lower bound of the bracket, cars over 1 500 cc. */
  extra: number
  /** Age coefficient (cars). */
  coefficient: number
  /** For the whole year. */
  annual: number
  /** For `months`. */
  tax: number
}

export type RegistrationKind = keyof typeof REGISTRATION

export interface RegistrationFee {
  /** Age counted with the year of manufacture. */
  age: number
  /** Rate in MRP. */
  rate: number
  fee: number
}

export type RecyclingKind = keyof Omit<typeof RECYCLING, 'baseMrp'>

export interface RecyclingOptions {
  /** Engine volume, cc (cars, buses). */
  volume?: number
  /** Gross mass, tonnes (trucks). */
  mass?: number
  /** Electric, not hybrid. */
  electric?: boolean
  /** Imported from Russia or Belarus: coefficient 2 of the methodology. */
  fromRuBy?: boolean
  /** Year of the MRP; default — the latest year in the data. */
  year?: number
}

export interface RecyclingFee {
  coefficient: number
  /** 50 MRP. */
  base: number
  fee: number
}

const tiyn = (n: number) => Math.round(n * 100) / 100

const positive = (n: number | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 && n < 1e6

const find = <T extends readonly (readonly number[])[]>(table: T, value: number) =>
  table.find((row) => value <= (row[0] as number)) as T[number]

/**
 * Annual transport tax of an individual (Tax Code art. 565–566).
 * @example
 * vehicleTax('car', { volume: 2000, made: 2015 }).value // { rate: 3, extra: 3500, coefficient: 0.7, annual: 11532.5, … }
 */
export const vehicleTax = (
  kind: VehicleKind,
  options: VehicleTaxOptions = {},
): Result<VehicleTax, VehicleError> => {
  const { months = 12 } = options
  const y = getTaxYear(options.year)
  if (!y) return err('data')
  if (!Number.isInteger(months) || months < 1 || months > 12) return err('range')
  let rate: number
  let extra = 0
  let coefficient = 1
  if (kind === 'car') {
    const { volume, made } = options
    if (!positive(volume)) return err('invalid')
    const i = TAX.car.findIndex(([up]) => volume <= up)
    rate = (TAX.car[i] as readonly number[])[1] as number
    const lower = i > 0 ? ((TAX.car[i - 1] as readonly number[])[0] as number) : 0
    if (volume > TAX.extraFrom) extra = Math.round(volume - lower) * TAX.extraPerCc
    if (made !== undefined) {
      if (!Number.isInteger(made) || made > y.year || made < 1900) return err('range')
      coefficient = find(TAX.age, y.year - made)[1]
    }
  } else if (kind === 'special') {
    rate = TAX.special
  } else {
    const value = { truck: options.tonnage, bus: options.seats, moto: options.kw }[kind]
    if (!positive(value)) return err('invalid')
    rate = find(TAX[kind], value)[1]
  }
  const annual = tiyn((rate * y.mrp + extra) * coefficient)
  return ok({ rate, mrp: y.mrp, extra, coefficient, annual, tax: tiyn((annual * months) / 12) })
}

/**
 * Fee for the first state registration of a vehicle in Kazakhstan (Tax Code art. 615 p. 4).
 * @example
 * registrationFee('car', 2024, { year: 2026 }).value // { age: 3, rate: 50, fee: 216250 }
 */
export const registrationFee = (
  kind: RegistrationKind,
  made: number,
  { year }: YearOption = {},
): Result<RegistrationFee, VehicleError> => {
  const y = getTaxYear(year)
  if (!y) return err('data')
  if (!own(REGISTRATION, kind)) return err('invalid')
  const table = REGISTRATION[kind]
  if (!Number.isInteger(made) || made > y.year + 1 || made < 1900) return err('range')
  const age = Math.max(1, y.year - made + 1)
  const rate = find(table, age)[1]
  return ok({ age, rate, fee: tiyn(rate * y.mrp) })
}

/**
 * Recycling fee paid once per vehicle before the first registration (methodology No. 448, annex 4).
 * @example
 * recyclingFee('car', { volume: 1600 }).value // { coefficient: 3.5, base: 216250, fee: 756875 }
 */
export const recyclingFee = (
  kind: RecyclingKind,
  options: RecyclingOptions = {},
): Result<RecyclingFee, VehicleError> => {
  const y = getTaxYear(options.year)
  if (!y) return err('data')
  if ((kind as string) === 'baseMrp' || !own(RECYCLING, kind)) return err('invalid')
  const t = RECYCLING[kind]
  const column = options.fromRuBy ? 2 : 1
  let row: readonly number[] | undefined
  if (options.electric) row = [0, ...t.electric]
  else {
    const value = kind === 'truck' ? options.mass : options.volume
    if (!positive(value)) return err('invalid')
    row = find(t.brackets, value)
    if (!row) return err('range')
  }
  const coefficient = row[column] as number
  const base = RECYCLING.baseMrp * y.mrp
  return ok({ coefficient, base, fee: tiyn(base * coefficient) })
}
