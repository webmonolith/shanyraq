import type { MoneyError } from '../core/errors'
import { err, ok, type Result } from '../core/result'

export interface Amount {
  tenge: number
  /** 0–99 */
  tiyn: number
}

export interface MoneyWordsOptions {
  /** Default `ru`. */
  lang?: 'ru' | 'kk'
  /** Tiyn in digits (default, NBRK rules No. 208 p. 10) or in words. */
  tiyn?: 'digits' | 'words'
  /** Russian spelling of the currency; `теңге` by default (Law No. 306-VIII). */
  currency?: 'теңге' | 'тенге'
  /** Kazakh «бір жүз», «бір мың» (default, as in official acts); `false` gives «жүз», «мың». */
  explicitOne?: boolean
  /** Capitalize the first letter; default `true`. */
  capitalize?: boolean
}

export const MAX_TENGE = 999_999_999_999_999

const AMOUNT = /^(\d+)(?:[.,](\d{1,2}))?$/
const SPACES = /[\s'’]/g

/**
 * Reads an amount from a number (rounded to tiyn), a bigint (whole tenge) or a string
 * like `1 234 567,89`.
 * @example
 * parseAmount('1 234,5') // { ok: true, value: { tenge: 1234, tiyn: 50 } }
 */
export const parseAmount = (input: number | bigint | string): Result<Amount, MoneyError> => {
  let tenge: number
  let tiyn = 0
  if (typeof input === 'bigint') {
    if (input < 0n || input > BigInt(MAX_TENGE)) return err('range')
    tenge = Number(input)
  } else if (typeof input === 'number') {
    if (!Number.isFinite(input)) return err('invalid')
    if (input < 0) return err('range')
    tenge = Math.floor(input)
    tiyn = Math.round((input - tenge) * 100)
    if (tiyn === 100) {
      tenge++
      tiyn = 0
    }
  } else if (typeof input === 'string') {
    const s = input.replace(SPACES, '')
    if (s.startsWith('-') && AMOUNT.test(s.slice(1))) return err('range')
    const m = AMOUNT.exec(s)
    if (!m) return err('invalid')
    tenge = Number(m[1])
    tiyn = Number((m[2] ?? '0').padEnd(2, '0'))
  } else return err('invalid')
  return tenge > MAX_TENGE ? err('range') : ok({ tenge, tiyn })
}

/**
 * True when `input` can be read as an amount (see {@link parseAmount}).
 * @example
 * isValidAmount('100,50') // true
 */
export const isValidAmount = (input: number | bigint | string): boolean => parseAmount(input).ok

const words = (list: string): string[] => list.split(' ')

const RU_ONES = words(' один два три четыре пять шесть семь восемь девять')
const RU_TEENS = words(
  'десять одиннадцать двенадцать тринадцать четырнадцать пятнадцать шестнадцать семнадцать восемнадцать девятнадцать',
)
const RU_TENS = words(
  '  двадцать тридцать сорок пятьдесят шестьдесят семьдесят восемьдесят девяносто',
)
const RU_HUNDREDS = words(
  ' сто двести триста четыреста пятьсот шестьсот семьсот восемьсот девятьсот',
)
const RU_SCALES = [
  words('тысяча тысячи тысяч'),
  words('миллион миллиона миллионов'),
  words('миллиард миллиарда миллиардов'),
  words('триллион триллиона триллионов'),
]
const RU_TIYN = words('тиын тиына тиынов')

const KK_ONES = words(' бір екі үш төрт бес алты жеті сегіз тоғыз')
const KK_TENS = words(' он жиырма отыз қырық елу алпыс жетпіс сексен тоқсан')
const KK_SCALES = words('мың миллион миллиард триллион')

const plural = (n: number, forms: string[]): string => {
  const d = n % 10
  const i = n % 100 >= 11 && n % 100 <= 14 ? 2 : d === 1 ? 0 : d >= 2 && d <= 4 ? 1 : 2
  return forms[i] as string
}

const triads = (n: number): number[] => {
  const out: number[] = []
  for (; n > 0; n = Math.floor(n / 1000)) out.push(n % 1000)
  return out
}

const ruTriad = (n: number, feminine: boolean): string[] => {
  const out = [RU_HUNDREDS[Math.floor(n / 100)] as string]
  const rest = n % 100
  if (rest >= 10 && rest < 20) out.push(RU_TEENS[rest - 10] as string)
  else {
    out.push(RU_TENS[Math.floor(rest / 10)] as string)
    const one = rest % 10
    out.push(feminine && one <= 2 ? (['', 'одна', 'две'][one] as string) : (RU_ONES[one] as string))
  }
  return out
}

const ruWords = (n: number): string => {
  if (n === 0) return 'ноль'
  const out: string[] = []
  triads(n).forEach((t, i) => {
    if (!t) return
    const scale = RU_SCALES[i - 1]
    out.unshift(...ruTriad(t, i === 1), scale ? plural(t, scale) : '')
  })
  return out.filter(Boolean).join(' ')
}

const kkTriad = (n: number, explicitOne: boolean): string[] => {
  const h = Math.floor(n / 100)
  return [
    h ? (h === 1 && !explicitOne ? 'жүз' : `${KK_ONES[h]} жүз`) : '',
    KK_TENS[Math.floor((n % 100) / 10)] as string,
    KK_ONES[n % 10] as string,
  ]
}

const kkWords = (n: number, explicitOne: boolean): string => {
  if (n === 0) return 'нөл'
  const out: string[] = []
  triads(n).forEach((t, i) => {
    if (!t) return
    const scale = KK_SCALES[i - 1]
    if (i === 1 && t === 1 && !explicitOne) out.unshift('мың')
    else out.unshift(...kkTriad(t, explicitOne), scale ?? '')
  })
  return out.filter(Boolean).join(' ')
}

/**
 * Amount in words for payment documents.
 * @example
 * moneyToWords(1234.5) // { ok: true, value: 'Одна тысяча двести тридцать четыре теңге 50 тиынов' }
 * moneyToWords(1234.5, { lang: 'kk' }) // { ok: true, value: 'Бір мың екі жүз отыз төрт теңге 50 тиын' }
 */
export const moneyToWords = (
  input: number | bigint | string,
  options: MoneyWordsOptions = {},
): Result<string, MoneyError> => {
  const amount = parseAmount(input)
  if (!amount.ok) return amount
  const { tenge, tiyn } = amount.value
  const kk = options.lang === 'kk'
  const explicitOne = options.explicitOne ?? true
  const say = (n: number) => (kk ? kkWords(n, explicitOne) : ruWords(n))
  const tiynText = options.tiyn === 'words' ? say(tiyn) : String(tiyn).padStart(2, '0')
  const text = `${say(tenge)} ${kk ? 'теңге' : (options.currency ?? 'теңге')} ${tiynText} ${kk ? 'тиын' : plural(tiyn, RU_TIYN)}`
  return ok(options.capitalize === false ? text : text[0]?.toUpperCase() + text.slice(1))
}
