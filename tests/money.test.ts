import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { isValidAmount, MAX_TENGE, moneyToWords, parseAmount } from '../src/money'

const ru = (input: number | bigint | string, options = {}) => {
  const r = moneyToWords(input, options)
  if (!r.ok) throw new Error(r.error)
  return r.value
}
const kk = (input: number | bigint | string, options = {}) => ru(input, { lang: 'kk', ...options })

describe('parseAmount', () => {
  it.each([
    [0, 0, 0],
    [1234.5, 1234, 50],
    [0.1 + 0.2, 0, 30],
    [0.29, 0, 29],
    [9.999, 10, 0],
    // half a tiyn rounds up whatever the binary float says
    [1.005, 1, 1],
    [0.015, 0, 2],
    [12n, 12, 0],
    ['1 234 567,89', 1234567, 89],
    ['1 234.5', 1234, 50],
    ["1'000", 1000, 0],
    ['007', 7, 0],
    [String(MAX_TENGE), MAX_TENGE, 0],
    [`${MAX_TENGE}.99`, MAX_TENGE, 99],
  ])('%s → %i тг %i тиын', (input, tenge, tiyn) => {
    expect(parseAmount(input)).toEqual({ ok: true, value: { tenge, tiyn } })
  })

  it.each([
    [Number.NaN, 'invalid'],
    [Number.POSITIVE_INFINITY, 'invalid'],
    ['', 'invalid'],
    ['1,234.56', 'invalid'],
    ['1.234', 'invalid'],
    ['12,', 'invalid'],
    ['abc', 'invalid'],
    ['1e3', 'invalid'],
    [{} as unknown as string, 'invalid'],
    [-1, 'range'],
    [-1n, 'range'],
    ['-5,50', 'range'],
    [1e15, 'range'],
    [BigInt(MAX_TENGE) + 1n, 'range'],
    [`${MAX_TENGE + 1}`, 'range'],
  ])('%s → %s', (input, error) => {
    expect(parseAmount(input)).toEqual({ ok: false, error })
    expect(isValidAmount(input)).toBe(false)
  })
})

describe('moneyToWords: ru', () => {
  it.each([
    [0, 'Ноль теңге 00 тиынов'],
    [1, 'Один теңге 00 тиынов'],
    [2, 'Два теңге 00 тиынов'],
    [11, 'Одиннадцать теңге 00 тиынов'],
    [19, 'Девятнадцать теңге 00 тиынов'],
    [20, 'Двадцать теңге 00 тиынов'],
    [101, 'Сто один теңге 00 тиынов'],
    [999, 'Девятьсот девяносто девять теңге 00 тиынов'],
    [1000, 'Одна тысяча теңге 00 тиынов'],
    [2000, 'Две тысячи теңге 00 тиынов'],
    [5000, 'Пять тысяч теңге 00 тиынов'],
    [11000, 'Одиннадцать тысяч теңге 00 тиынов'],
    [21000, 'Двадцать одна тысяча теңге 00 тиынов'],
    [112000, 'Сто двенадцать тысяч теңге 00 тиынов'],
    [1_000_000, 'Один миллион теңге 00 тиынов'],
    [3_000_000, 'Три миллиона теңге 00 тиынов'],
    [5_001_000, 'Пять миллионов одна тысяча теңге 00 тиынов'],
    [2_000_000_000, 'Два миллиарда теңге 00 тиынов'],
    [1_000_000_000_000, 'Один триллион теңге 00 тиынов'],
    [
      MAX_TENGE,
      'Девятьсот девяносто девять триллионов девятьсот девяносто девять миллиардов девятьсот девяносто девять миллионов девятьсот девяносто девять тысяч девятьсот девяносто девять теңге 00 тиынов',
    ],
    [1234.56, 'Одна тысяча двести тридцать четыре теңге 56 тиынов'],
  ])('%j', (n, text) => {
    expect(ru(n)).toBe(text)
  })

  it('declines тиын', () => {
    expect(ru(0.01)).toBe('Ноль теңге 01 тиын')
    expect(ru(0.02)).toBe('Ноль теңге 02 тиына')
    expect(ru(0.05)).toBe('Ноль теңге 05 тиынов')
    expect(ru(0.11)).toBe('Ноль теңге 11 тиынов')
    expect(ru(0.21)).toBe('Ноль теңге 21 тиын')
    expect(ru(0.24)).toBe('Ноль теңге 24 тиына')
  })

  it('options: tiyn in words, «тенге», lowercase', () => {
    expect(ru(21.22, { tiyn: 'words' })).toBe('Двадцать один теңге двадцать два тиына')
    expect(ru(5, { currency: 'тенге' })).toBe('Пять тенге 00 тиынов')
    expect(ru(5, { capitalize: false })).toBe('пять теңге 00 тиынов')
  })
})

describe('moneyToWords: kk', () => {
  it.each([
    [0, 'Нөл теңге 00 тиын'],
    [11, 'Он бір теңге 00 тиын'],
    [40, 'Қырық теңге 00 тиын'],
    [100, 'Бір жүз теңге 00 тиын'],
    [1000, 'Бір мың теңге 00 тиын'],
    [1100, 'Бір мың бір жүз теңге 00 тиын'],
    [2_000_000, 'Екі миллион теңге 00 тиын'],
    [1_000_000_000, 'Бір миллиард теңге 00 тиын'],
    [1_000_000_000_000, 'Бір триллион теңге 00 тиын'],
    [1234.5, 'Бір мың екі жүз отыз төрт теңге 50 тиын'],
  ])('%j', (n, text) => {
    expect(kk(n)).toBe(text)
  })

  it('explicitOne: false drops «бір» before жүз and мың only', () => {
    expect(kk(100, { explicitOne: false })).toBe('Жүз теңге 00 тиын')
    expect(kk(1100, { explicitOne: false })).toBe('Мың жүз теңге 00 тиын')
    expect(kk(101_000, { explicitOne: false })).toBe('Жүз бір мың теңге 00 тиын')
    expect(kk(1_000_000, { explicitOne: false })).toBe('Бір миллион теңге 00 тиын')
  })

  it('tiyn in words; the «тенге» option is ru only', () => {
    expect(kk(0.5, { tiyn: 'words' })).toBe('Нөл теңге елу тиын')
    expect(kk(1, { currency: 'тенге' })).toBe('Бір теңге 00 тиын')
  })
})

describe('moneyToWords', () => {
  it('passes parse errors through', () => {
    expect(moneyToWords('x')).toEqual({ ok: false, error: 'invalid' })
    expect(moneyToWords(-1, { lang: 'kk' })).toEqual({ ok: false, error: 'range' })
  })

  it('always yields clean text for any amount in range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_TENGE }),
        fc.integer({ min: 0, max: 99 }),
        fc.constantFrom('ru', 'kk') as fc.Arbitrary<'ru'>,
        fc.boolean(),
        (tenge, tiyn, lang, explicitOne) => {
          const text = ru(`${tenge}.${String(tiyn).padStart(2, '0')}`, { lang, explicitOne })
          return (
            /^[А-ЯӘҒҚҢӨҰҮҺІ][а-яәғқңөұүһі ]+ теңге \d\d тиын(а|ов)?$/.test(text) &&
            !text.includes('  ')
          )
        },
      ),
      { numRuns: 10_000 },
    )
  })
})
