import { dayNumber } from '../core/date'
import type { DateError } from '../core/errors'
import { err, ok, type Result } from '../core/result'

export interface DateInfo {
  /** `YYYY-MM-DD` */
  iso: string
  year: number
  month: number
  day: number
}

export interface DateOptions {
  /** Only `YYYY-MM-DD`, `DD.MM.YYYY`, `22 октября 2026 года` and `2026 жылғы 22 қазан` exactly. */
  strict?: boolean
}

export interface FormatDateOptions {
  /** Default `ru`. */
  lang?: 'ru' | 'kk'
  /** `long` (default): `22 октября 2026 года`, `2026 жылғы 22 қазан`; `numeric`: `22.10.2026`. */
  style?: 'long' | 'numeric'
  /** kk only: attributive form before a noun, `2026 жылғы 22 қазандағы (№ 1 бұйрық)`. */
  attributive?: boolean
}

const words = (list: string): string[] => list.split(' ')

const RU_MONTHS = words(
  'января февраля марта апреля мая июня июля августа сентября октября ноября декабря',
)
const KK_MONTHS = words(
  'қаңтар ақпан наурыз сәуір мамыр маусым шілде тамыз қыркүйек қазан қараша желтоқсан',
)
// Locative + -ғы/-гі by vowel harmony and voicing (order No. 236 samples: қазандағы, қыркүйектегі).
const KK_ATTRIBUTIVE = words(
  'қаңтардағы ақпандағы наурыздағы сәуірдегі мамырдағы маусымдағы шілдедегі тамыздағы қыркүйектегі қазандағы қарашадағы желтоқсандағы',
)

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/
const NUMERIC = /^(\d{2})\.(\d{2})\.(\d{4})$/
const NUMERIC_LOOSE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/
const RU = /^(\d{1,2}) (\S+) (\d{4}) года$/
const RU_LOOSE = /^(\d{1,2}) (\S+) (\d{4})(?: ?(?:года|г\.?))?$/
const KK = /^(\d{4}) жылғы (\d{1,2}) (\S+)$/
const KK_LOOSE = /^(\d{4}) (?:жылғы|ж\.) ?(\d{1,2}) (\S+)$/

const toInfo = (year: number, month: number, day: number): Result<DateInfo, DateError> =>
  dayNumber(year, month, day) === undefined
    ? err('date')
    : ok({
        iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        year,
        month,
        day,
      })

/**
 * Reads `YYYY-MM-DD`, `DD.MM.YYYY`, `22 октября 2026 года` or `2026 жылғы 22 қазан(дағы)`.
 * Lenient mode also takes `1.2.2026`, `/` and `-` separators, `г.`, `ж.` and any letter case.
 * @example
 * parseDate('2026 жылғы 22 қазан') // { ok: true, value: { iso: '2026-10-22', year: 2026, month: 10, day: 22 } }
 */
export const parseDate = (
  input: string,
  options: DateOptions = {},
): Result<DateInfo, DateError> => {
  if (typeof input !== 'string') return err('format')
  const strict = options.strict
  const s = strict ? input : input.trim().replace(/\s+/g, ' ').toLowerCase()
  let m = ISO.exec(s)
  if (m) return toInfo(Number(m[1]), Number(m[2]), Number(m[3]))
  m = (strict ? NUMERIC : NUMERIC_LOOSE).exec(s)
  if (m) return toInfo(Number(m[3]), Number(m[2]), Number(m[1]))
  m = (strict ? RU : RU_LOOSE).exec(s)
  if (m) {
    const month = RU_MONTHS.indexOf(m[2] as string) + 1
    if (month) return toInfo(Number(m[3]), month, Number(m[1]))
  }
  m = (strict ? KK : KK_LOOSE).exec(s)
  if (m) {
    const name = m[3] as string
    const month = KK_MONTHS.indexOf(name) + 1 || (strict ? 0 : KK_ATTRIBUTIVE.indexOf(name) + 1)
    if (month) return toInfo(Number(m[1]), month, Number(m[2]))
  }
  return err('format')
}

/**
 * True when `input` is a real calendar date in a supported spelling (see {@link parseDate}).
 * @example
 * isValidDate('29.02.2027') // false
 */
export const isValidDate = (input: string, options?: DateOptions): boolean =>
  parseDate(input, options).ok

/**
 * Document date in the official word-and-digit form (order No. 236 of 25.08.2023, p. 21).
 * Takes a `Date` (local calendar day) or any string {@link parseDate} reads.
 * @example
 * formatDate('2026-10-22') // { ok: true, value: '22 октября 2026 года' }
 * formatDate('2026-10-22', { lang: 'kk' }) // { ok: true, value: '2026 жылғы 22 қазан' }
 */
export const formatDate = (
  input: Date | string,
  options: FormatDateOptions = {},
): Result<string, DateError> => {
  const info =
    input instanceof Date
      ? toInfo(input.getFullYear(), input.getMonth() + 1, input.getDate())
      : parseDate(input)
  if (!info.ok) return info
  const { year, month, day } = info.value
  if (options.style === 'numeric')
    return ok(`${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`)
  if (options.lang !== 'kk') return ok(`${day} ${RU_MONTHS[month - 1]} ${year} года`)
  const months = options.attributive ? KK_ATTRIBUTIVE : KK_MONTHS
  return ok(`${year} жылғы ${day} ${months[month - 1]}`)
}
