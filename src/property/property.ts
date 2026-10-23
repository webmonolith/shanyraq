import type { PropertyError } from '../core/errors'
import { err, ok, type Result } from '../core/result'
import { getTaxYear, MAX_SALARY } from '../tax/tax'
import { LAND, RATES, SETTLEMENTS, VALUE } from './generated'

export type Settlement = keyof typeof SETTLEMENTS
export type PropertyKind = 'dwelling' | 'storage' | 'garage'
export type WallMaterial = keyof typeof VALUE.walls
export type Heating = keyof typeof VALUE.heating
export type LandKind = 'housing' | 'yard' | 'garden'

export interface PropertyValueOptions {
  /** Dwelling or dacha; storage room, cold annex, outbuilding, basement (25 % of the base); garage or parking place (15 %). Default dwelling. */
  kind?: PropertyKind
  settlement: Settlement
  /** Useful area (dwelling) or total area, m². */
  area: number | string
  /** Year put into service. */
  built: number
  /** Capital group 1–6 (Tax Code art. 600 p. 4). Default 1: stone, large-panel. */
  group?: number
  /** Tax year. Default — the latest year in the data. */
  year?: number
  /** Default middle (also a private house); low-rise blocks up to 3 floors count as middle. */
  floor?: 'first' | 'middle' | 'last'
  corner?: boolean
  /** Default other (1). */
  walls?: WallMaterial
  /** Water, sewerage and other utilities. Default true. */
  amenities?: boolean
  /** Default central. */
  heating?: Heating
  /** Zoning coefficient set by the local akimat. Default 1. */
  zone?: number
  /** Luxury coefficient 1–1.5 set by the maslikhat. Default 1. */
  luxury?: number
  /** MRP change coefficient. Default — MRP of `year` / MRP of the year before. */
  mrpIndex?: number
}

export interface PropertyValue {
  /** Base cost of 1 m² for this kind of object. */
  base: number
  /** Physical wear, percent. */
  wear: number
  physical: number
  functional: number
  zone: number
  mrpIndex: number
  luxury: number
  value: number
}

export interface PropertyObject {
  value: number | string
  /** Share in common ownership, 0–1. Default 1. */
  share?: number
  /** Months owned in the year, 1–12. Default 12. */
  months?: number
}

export interface PropertyTaxItem {
  /** Value of the owner's share. */
  value: number
  annual: number
  tax: number
}

export interface PropertyTax {
  /** Sum of the values. */
  base: number
  /** Over 450 mln ₸: one tax on the total, split by value (art. 604). */
  aggregate: boolean
  items: PropertyTaxItem[]
  tax: number
}

export interface LandTaxOptions {
  /** Needed for housing and yard land. */
  settlement?: Settlement
  /** Maslikhat change of the housing land rate, −50…50 %. */
  adjust?: number
  /** Maslikhat lowered the yard rate above the threshold to the low one. */
  reduced?: boolean
  share?: number
  months?: number
}

export interface LandTax {
  annual: number
  tax: number
}

const tiyn = (n: number) => Math.round(n * 100) / 100

const amount = (input: number | string): Result<number, PropertyError> => {
  const s = typeof input === 'string' ? input.replace(/[\s ]/g, '') : ''
  const n =
    typeof input === 'number'
      ? input
      : /^\d+(?:[.,]\d+)?$/.test(s)
        ? Number(s.replace(',', '.'))
        : Number.NaN
  if (!Number.isFinite(n)) return err('invalid')
  return n < 0 || n > MAX_SALARY ? err('range') : ok(n)
}

const within = (n: number, min: number, max: number) => n >= min && n <= max

const mrpOf = (year: number) =>
  getTaxYear(year)?.mrp ?? (VALUE.mrp as Record<string, number | undefined>)[year]

/**
 * Value of a dwelling, dacha, garage or outbuilding for the tax, as the State Corporation computes it (Tax Code art. 600 p. 1–8).
 * @example
 * propertyValue({ settlement: 'almaty', area: 60, built: 2010, walls: 'panel' }).value // { wear: 11.2, physical: 0.888, value: 3516317.4, … }
 */
export const propertyValue = (
  options: PropertyValueOptions,
): Result<PropertyValue, PropertyError> => {
  const { kind = 'dwelling', group = 1, floor = 'middle', walls = 'other' } = options
  const { heating = 'central', zone = 1, luxury = 1 } = options
  const settlement = SETTLEMENTS[options.settlement]
  const norm = VALUE.norms[group - 1]
  const year = options.year ?? (getTaxYear() as { year: number }).year
  const a = amount(options.area)
  if (!a.ok) return a
  if (
    !settlement ||
    !norm ||
    !(walls in VALUE.walls) ||
    !(heating in VALUE.heating) ||
    !(floor in VALUE.floor) ||
    !Number.isInteger(options.built) ||
    !within(options.built, 1800, year) ||
    !within(zone, 0.01, 10) ||
    !within(luxury, 1, VALUE.luxuryMax)
  )
    return err('range')
  let mrpIndex = options.mrpIndex
  if (mrpIndex === undefined) {
    const now = mrpOf(year)
    const before = mrpOf(year - 1)
    if (!now || !before) return err('data')
    mrpIndex = now / before
  } else if (!within(mrpIndex, 0.5, 2)) return err('range')
  const share = kind === 'dwelling' ? 100 : VALUE.auxiliary[kind]
  if (share === undefined) return err('range')
  const base = (settlement[0] * share) / 100
  const wear = Math.round((year - options.built) * norm[0] * 100) / 100
  const physical =
    wear > (norm[1] ? VALUE.limitStone : VALUE.limitOther) ? VALUE.wearFloor : 1 - wear / 100
  const functional =
    kind === 'dwelling'
      ? VALUE.floor[floor] *
        (options.corner ? VALUE.corner : 1) *
        VALUE.walls[walls] *
        (options.amenities === false ? VALUE.noAmenities : 1) *
        VALUE.heating[heating]
      : 1
  const lux = kind === 'dwelling' ? luxury : 1
  return ok({
    base,
    wear,
    physical: Math.round(physical * 1e4) / 1e4,
    functional: Math.round(functional * 1e6) / 1e6,
    zone,
    mrpIndex: Math.round(mrpIndex * 1e6) / 1e6,
    luxury: lux,
    value: tiyn(base * a.value * physical * functional * zone * mrpIndex * lux),
  })
}

// The last bracket is open (Infinity), so a row is always found.
const scale = (value: number) => {
  const i = RATES.scale.findIndex(([upper]) => value <= upper)
  const [, fixed, percent] = RATES.scale[i] as readonly number[]
  const lower = i ? (RATES.scale[i - 1] as readonly number[])[0] : 0
  return (fixed as number) + ((value - (lower as number)) * (percent as number)) / 100
}

/**
 * Property tax of an individual on dwellings and buildings by the scale of Tax Code art. 602 p. 1; over 450 mln ₸ in total — one tax on the total (art. 604).
 * @example
 * propertyTax(15000000).value // { base: 15000000, aggregate: false, items: [{ value: 15000000, annual: 26100, tax: 26100 }], tax: 26100 }
 */
export const propertyTax = (
  objects: number | string | PropertyObject | PropertyObject[],
): Result<PropertyTax, PropertyError> => {
  const list = Array.isArray(objects)
    ? objects
    : [typeof objects === 'object' ? objects : { value: objects }]
  const items: { value: number; months: number }[] = []
  for (const o of list) {
    const v = amount(o.value)
    if (!v.ok) return v
    const { share = 1, months = 12 } = o
    if (!within(share, 0, 1) || !Number.isInteger(months) || !within(months, 1, 12))
      return err('range')
    items.push({ value: tiyn(v.value * share), months })
  }
  if (!items.length) return err('range')
  const base = tiyn(items.reduce((s, i) => s + i.value, 0))
  const aggregate = base > RATES.limit
  const total = scale(base)
  const out = items.map((i) => {
    const annual = tiyn(aggregate ? (total * i.value) / base : scale(i.value))
    return { value: i.value, annual, tax: tiyn((annual * i.months) / 12) }
  })
  return ok({ base, aggregate, items: out, tax: tiyn(out.reduce((s, i) => s + i.tax, 0)) })
}

/**
 * Land tax of an individual: housing land, yard plot or garden / dacha / personal farm plot (Tax Code art. 602 p. 2–4, 6).
 * @example
 * landTax('yard', 1200, { settlement: 'almaty' }).value // { annual: 1400, tax: 1400 }
 */
export const landTax = (
  kind: LandKind,
  area: number | string,
  options: LandTaxOptions = {},
): Result<LandTax, PropertyError> => {
  const { adjust = 0, share = 1, months = 12 } = options
  const a = amount(area)
  if (!a.ok) return a
  const place = options.settlement === undefined ? undefined : SETTLEMENTS[options.settlement]
  if (
    !within(adjust, -LAND.adjust, LAND.adjust) ||
    !within(share, 0, 1) ||
    !Number.isInteger(months) ||
    !within(months, 1, 12) ||
    (kind !== 'garden' && !place)
  )
    return err('range')
  const s = a.value * share
  let annual: number
  if (kind === 'housing')
    annual = s * (place as readonly [number, number, number])[1] * (1 + adjust / 100)
  else if (kind === 'yard') {
    const r = (place as readonly [number, number, number])[2] ? LAND.yard.city : LAND.yard.other
    annual =
      Math.min(s, r.upTo) * r.low + Math.max(0, s - r.upTo) * (options.reduced ? r.low : r.high)
  } else if (kind === 'garden') {
    const units = s / (LAND.garden.per * 10000)
    const limit = LAND.garden.upToHa / LAND.garden.per
    annual =
      Math.min(units, limit) * LAND.garden.low + Math.max(0, units - limit) * LAND.garden.high
  } else return err('range')
  annual = tiyn(annual)
  return ok({ annual, tax: tiyn((annual * months) / 12) })
}
