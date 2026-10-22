import { isDigits, stripSeparators } from '../core/digits'
import type { PhoneError } from '../core/errors'
import { err, ok, type Result } from '../core/result'
import {
  GEOGRAPHIC_RANGES,
  KZ_RANGES,
  LANDLINE,
  MOBILE,
  OTHER_CODES,
  RU_RANGES,
  SHARED_RANGES,
} from './generated'
import type { PhoneCountry, PhoneFormat, PhoneInfo, PhoneOptions } from './types'

const inRanges = (code: number, ranges: number[][]): boolean =>
  ranges.some(([lo, hi]) => code >= (lo as number) && code <= (hi as number))

const country = (code: number): PhoneCountry | undefined =>
  inRanges(code, KZ_RANGES)
    ? 'KZ'
    : inRanges(code, RU_RANGES)
      ? 'RU'
      : inRanges(code, SHARED_RANGES)
        ? 'ambiguous'
        : undefined

// 810 and 00 are international prefixes when dialled before a full number.
const INTERNATIONAL = /^(?:810(?=\d{9})|00(?=\d{10}))/

const toNSN = (input: string, strict?: boolean): Result<string, PhoneError> => {
  const s = strict ? input : input.replace(INTERNATIONAL, '+')
  const plus = s.startsWith('+')
  const digits = plus ? s.slice(1) : s
  if ((plus || digits) && !isDigits(digits)) return err('format')
  if (plus) {
    if (digits[0] !== '7') return err('country')
    return digits.length === 11 ? ok(digits.slice(1)) : err('length')
  }
  if (digits.length === 11 && (digits[0] === '8' || (!strict && digits[0] === '7')))
    return ok(digits.slice(1))
  if (digits.length === 10 && !strict) return ok(digits)
  return err('length')
}

/**
 * Parses a +7 phone number: country by numbering range, KZ mobile operator or city.
 * @example
 * parsePhone('8 (707) 123-45-67') // { ok: true, value: { e164: '+77071234567', country: 'KZ', type: 'mobile', originalOperator: 'tele2-altel', ... } }
 */
export const parsePhone = (
  input: string,
  options: PhoneOptions = {},
): Result<PhoneInfo, PhoneError> => {
  if (typeof input !== 'string') return err('format')
  const { strict } = options
  const nsn = toNSN(strict ? input : stripSeparators(input), strict)
  if (!nsn.ok) return nsn
  const n = nsn.value
  const ndc = n.slice(0, 3)
  const code = Number(ndc)
  const c = country(code)
  if (!c) return err('prefix')
  if (strict && c !== 'KZ') return err('country')
  const info: PhoneInfo = { e164: `+7${n}`, nsn: n, ndc, country: c, type: 'unknown' }
  if (c === 'KZ') {
    const operator = MOBILE[ndc]
    if (operator) {
      info.type = 'mobile'
      info.originalOperator = operator
    } else if (OTHER_CODES.includes(ndc)) info.type = 'other'
    else if (inRanges(code, GEOGRAPHIC_RANGES)) {
      info.type = 'landline'
      const city = LANDLINE.find(
        ([area, next]) => n.startsWith(area) && (!next || next.includes(n[area.length] as string)),
      )
      if (city) {
        info.areaCode = city[0]
        info.city = { ru: city[2], kk: city[3], en: city[4] }
      }
    }
  }
  if (strict && info.type === 'unknown') return err('prefix')
  return ok(info)
}

/**
 * True when `input` is a valid +7 phone number (see {@link parsePhone}).
 * @example
 * isValidPhone('+7 707 123 45 67') // true
 */
export const isValidPhone = (input: string, options?: PhoneOptions): boolean =>
  parsePhone(input, options).ok

/**
 * Formats a parsed number; the area code is used for known cities, the 3-digit code otherwise.
 * @example
 * formatPhone(phone, 'national') // '8 (707) 123-45-67'
 */
export const formatPhone = (phone: PhoneInfo, format: PhoneFormat = 'international'): string => {
  if (format === 'e164') return phone.e164
  const code = phone.areaCode ?? phone.ndc
  const rest = phone.nsn.slice(code.length)
  const head = rest.length - 4
  const groups = [rest.slice(0, head), rest.slice(head, head + 2), rest.slice(head + 2)]
  return format === 'national'
    ? `8 (${code}) ${groups.join('-')}`
    : `+7 ${code} ${groups.join(' ')}`
}
