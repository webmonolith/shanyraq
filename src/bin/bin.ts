import { hasValidCheckDigit } from '../core/checksum'
import type { BINError } from '../core/errors'
import { readId } from '../core/id'
import { err, ok, type Result } from '../core/result'

/** 5th digit: 4, 5, 6; `reserved` for 7–9 (MoJ order No. 423). */
export type EntityType = 'resident' | 'nonResident' | 'jointEntrepreneur' | 'reserved'

/** 6th digit: 0, 1, 2; `farm` is 4 (2023 rules) or 3 (2007 rules). */
export type DivisionType = 'head' | 'branch' | 'representative' | 'farm'

export interface BINInfo {
  /** 12 digits without separators. */
  value: string
  /** Registration year (last two digits) and month; the century is not encoded. */
  registered?: { yy: number; month: number }
  entityType: EntityType
  divisionType?: DivisionType
  /** Digits 7–11, registration serial number. */
  serial: string
}

export interface BINOptions {
  /** No separator stripping; reject reserved 5th digits, unknown 6th digits and months. */
  strict?: boolean
}

const ENTITY: (EntityType | undefined)[] = [
  undefined,
  undefined,
  undefined,
  undefined,
  'resident',
  'nonResident',
  'jointEntrepreneur',
  'reserved',
  'reserved',
  'reserved',
]

const DIVISION: (DivisionType | undefined)[] = ['head', 'branch', 'representative', 'farm', 'farm']

/**
 * Parses a BIN: 12 digits, 5th digit not 0–3 and a valid check digit.
 * @example
 * parseBIN('180340021791') // { ok: true, value: { value: '180340021791', registered: { yy: 18, month: 3 }, entityType: 'resident', divisionType: 'head', serial: '02179' } }
 */
export const parseBIN = (input: string, options: BINOptions = {}): Result<BINInfo, BINError> => {
  const id = readId(input, options.strict)
  if (!id.ok) return id
  const s = id.value
  if (!hasValidCheckDigit(s)) return err('checksum')
  const strict = options.strict
  const entityType = ENTITY[s.charCodeAt(4) - 48]
  if (!entityType || (strict && entityType === 'reserved')) return err('entityType')
  const month = Number(s.slice(2, 4))
  const validMonth = month >= 1 && month <= 12
  if (strict && !validMonth) return err('date')
  const divisionType = DIVISION[s.charCodeAt(5) - 48]
  if (strict && !divisionType) return err('divisionType')
  const info: BINInfo = { value: s, entityType, serial: s.slice(6, 11) }
  if (validMonth) info.registered = { yy: Number(s.slice(0, 2)), month }
  if (divisionType) info.divisionType = divisionType
  return ok(info)
}

/**
 * True when `input` is a valid BIN (see {@link parseBIN}).
 * @example
 * isValidBIN('180340021791') // true
 */
export const isValidBIN = (input: string, options?: BINOptions): boolean =>
  parseBIN(input, options).ok
