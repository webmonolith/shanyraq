import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { formatDate, isValidDate, parseDate } from '../src/date'

const fmt = (input: Date | string, options = {}): string => {
  const r = formatDate(input, options)
  if (!r.ok) throw new Error(r.error)
  return r.value
}

const value = { iso: '2026-10-22', year: 2026, month: 10, day: 22 }

describe('parseDate', () => {
  it.each(['2026-10-22', '22.10.2026', '22 октября 2026 года', '2026 жылғы 22 қазан'])(
    'strict reads %j',
    (input) => {
      expect(parseDate(input, { strict: true })).toEqual({ ok: true, value })
    },
  )

  it.each([
    '22/10/2026',
    '22-10-2026',
    ' 22 октября 2026 г. ',
    '22 Октября 2026',
    '22 октября 2026г',
    '2026 ж. 22 қазан',
    '2026 жылғы 22 қазандағы',
    '2026  ЖЫЛҒЫ 22 ҚАЗАН',
  ])('lenient reads %j', (input) => {
    expect(parseDate(input)).toEqual({ ok: true, value })
    expect(parseDate(input, { strict: true })).toEqual({ ok: false, error: 'format' })
  })

  it('single-digit day and month', () => {
    expect(parseDate('1.2.2026')).toMatchObject({ ok: true, value: { iso: '2026-02-01' } })
    expect(parseDate('1 февраля 2026 года', { strict: true }).ok).toBe(true)
  })

  it.each([
    ['29.02.2027', 'date'],
    ['2026-13-01', 'date'],
    ['31 апреля 2026 года', 'date'],
    ['2026 жылғы 30 ақпан', 'date'],
    ['0999-01-01', 'date'],
    ['', 'format'],
    ['22 октябрь 2026 года', 'format'],
    ['2026 жылғы 22 октября', 'format'],
    ['2026/10/22', 'format'],
    ['22.10.26', 'format'],
  ])('%j → %s', (input, error) => {
    expect(parseDate(input)).toEqual({ ok: false, error })
  })

  it('29 February in leap years', () => {
    expect(isValidDate('29.02.2028')).toBe(true)
    expect(isValidDate('29.02.2100')).toBe(false)
    expect(isValidDate('29.02.2000')).toBe(true)
  })

  it('rejects non-strings from untyped callers', () => {
    expect(parseDate(1 as unknown as string)).toEqual({ ok: false, error: 'format' })
  })
})

describe('formatDate', () => {
  it('official word-and-digit forms', () => {
    expect(fmt('2026-10-22')).toBe('22 октября 2026 года')
    expect(fmt('2026-03-01', { lang: 'ru' })).toBe('1 марта 2026 года')
    expect(fmt('2026-10-22', { lang: 'kk' })).toBe('2026 жылғы 22 қазан')
    expect(fmt('2026-10-22', { lang: 'kk', attributive: true })).toBe('2026 жылғы 22 қазандағы')
    expect(fmt('2023-09-11', { lang: 'kk', attributive: true })).toBe('2023 жылғы 11 қыркүйектегі')
    expect(fmt('2026-10-22', { style: 'numeric' })).toBe('22.10.2026')
    expect(fmt('2026-01-05', { style: 'numeric', lang: 'kk' })).toBe('05.01.2026')
  })

  it('takes a Date by its local calendar day and any parseDate spelling', () => {
    expect(fmt(new Date(2026, 9, 22, 23, 30))).toBe('22 октября 2026 года')
    expect(fmt('2026 жылғы 22 қазан')).toBe('22 октября 2026 года')
  })

  it('errors', () => {
    expect(formatDate('31.04.2026')).toEqual({ ok: false, error: 'date' })
    expect(formatDate(new Date(Number.NaN))).toEqual({ ok: false, error: 'date' })
    expect(formatDate('tomorrow')).toEqual({ ok: false, error: 'format' })
  })

  it('every style and language parses back to the same date (strict)', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(1000, 0, 1), max: new Date(9999, 11, 31), noInvalidDate: true }),
        fc.constantFrom('ru', 'kk') as fc.Arbitrary<'ru'>,
        fc.constantFrom('long', 'numeric') as fc.Arbitrary<'long'>,
        (date, lang, style) => {
          const text = fmt(date, { lang, style })
          const back = parseDate(text, { strict: true })
          return (
            back.ok &&
            back.value.year === date.getFullYear() &&
            back.value.month === date.getMonth() + 1 &&
            back.value.day === date.getDate()
          )
        },
      ),
      { numRuns: 10_000 },
    )
  })
})
