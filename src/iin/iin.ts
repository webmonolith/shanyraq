import { hasValidCheckDigit } from '../core/checksum'
import type { IINError } from '../core/errors'
import { daysInMonth, readId } from '../core/id'
import { err, ok, type Result } from '../core/result'

export type Gender = 'male' | 'female'

export interface IINInfo {
  /** 12 digits without separators. */
  value: string
  /** `YYYY-MM-DD`, present only when the pre-2013 structure decodes. */
  birthDate?: string
  gender?: Gender
  /** 19, 20 or 21 (XIX–XXI). */
  century?: 19 | 20 | 21
}

export interface IINOptions {
  /** No separator stripping; require a decodable birth date and 7th digit 1–6. */
  strict?: boolean
}

type Decoded = Required<Omit<IINInfo, 'value'>>

const decode = (s: string): Decoded | 'century' | 'date' => {
  const c = s.charCodeAt(6) - 48
  if (c < 1 || c > 6) return 'century'
  const half = (c - 1) >> 1
  const year = 1800 + half * 100 + Number(s.slice(0, 2))
  const month = Number(s.slice(2, 4))
  const day = Number(s.slice(4, 6))
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return 'date'
  return {
    birthDate: `${year}-${s.slice(2, 4)}-${s.slice(4, 6)}`,
    gender: c % 2 ? 'male' : 'female',
    century: (19 + half) as Decoded['century'],
  }
}

/**
 * Parses an IIN: 12 digits and a valid check digit; birth date, gender and century when decodable.
 * @example
 * parseIIN('900101 300126') // { ok: true, value: { value: '900101300126', birthDate: '1990-01-01', gender: 'male', century: 20 } }
 */
export const parseIIN = (input: string, options: IINOptions = {}): Result<IINInfo, IINError> => {
  const id = readId(input, options.strict)
  if (!id.ok) return id
  const s = id.value
  if (!hasValidCheckDigit(s)) return err('checksum')
  const decoded = decode(s)
  if (typeof decoded === 'string') return options.strict ? err(decoded) : ok({ value: s })
  return ok({ value: s, ...decoded })
}

/**
 * True when `input` is a valid IIN (see {@link parseIIN}).
 * @example
 * isValidIIN('900101300126') // true
 */
export const isValidIIN = (input: string, options?: IINOptions): boolean =>
  parseIIN(input, options).ok
