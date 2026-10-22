import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import data from '../data/phone.json'
import { formatPhone, isValidPhone, type PhoneInfo, parsePhone } from '../src/phone'
import { digitString } from './helpers'

const info = (input: string): PhoneInfo => {
  const r = parsePhone(input)
  if (!r.ok) throw new Error(`${input}: ${r.error}`)
  return r.value
}

describe('parsePhone', () => {
  it.each([
    '+77071234567',
    '+7 707 123 45 67',
    '+7 (707) 123-45-67',
    '8 707 123 45 67',
    '87071234567',
    '77071234567',
    '7071234567',
    '0077071234567',
    '81077071234567',
    '+7 707 123‑45‑67',
  ])('normalizes %j', (input) => {
    expect(info(input).e164).toBe('+77071234567')
  })

  it.each([
    ['700', 'tele2-altel'],
    ['701', 'kcell'],
    ['702', 'kcell'],
    ['705', 'beeline'],
    ['706', 'beeline'],
    ['707', 'tele2-altel'],
    ['708', 'tele2-altel'],
    ['747', 'tele2-altel'],
    ['771', 'beeline'],
    ['775', 'kcell'],
    ['776', 'beeline'],
    ['777', 'beeline'],
    ['778', 'kcell'],
  ])('mobile %s → %s', (ndc, originalOperator) => {
    expect(info(`+7${ndc}1234567`)).toEqual({
      e164: `+7${ndc}1234567`,
      nsn: `${ndc}1234567`,
      ndc,
      country: 'KZ',
      type: 'mobile',
      originalOperator,
    })
  })

  it.each([
    ['7172123456', '7172', 'Астана'],
    ['7272123456', '727', 'Алматы'],
    ['7273123456', '727', 'Алматы'],
    ['7277212345', '72772', 'Конаев'],
    ['7253312345', '72533', 'Туркестан'],
    ['7252123456', '7252', 'Шымкент'],
  ])('landline %s → %s %s', (nsn, areaCode, city) => {
    expect(info(nsn)).toMatchObject({ type: 'landline', areaCode, city: { ru: city } })
  })

  it('landline outside known cities has no areaCode', () => {
    const p = info('+77213712345')
    expect(p.type).toBe('landline')
    expect(p.areaCode).toBeUndefined()
    expect(info('+77271123456').areaCode).toBeUndefined()
  })

  it.each(['750', '751', '753', '760', '763', '790'])('KZ non-mobile code %s → other', (ndc) => {
    expect(info(`+7${ndc}1234567`)).toMatchObject({ country: 'KZ', type: 'other' })
  })

  it.each([
    ['+79161234567', 'RU'],
    ['+74951234567', 'RU'],
    ['+78121234567', 'RU'],
    ['+78001234567', 'ambiguous'],
    ['+71231234567', 'ambiguous'],
    ['+78901234567', 'ambiguous'],
    ['+70121234567', 'KZ'],
    ['+76001234567', 'KZ'],
    ['+77031234567', 'KZ'],
  ])('country of %s → %s', (input, country) => {
    expect(info(input)).toMatchObject({ country })
  })

  it('KZ codes not in use and non-KZ numbers are rejected in strict mode', () => {
    expect(info('+77031234567').type).toBe('unknown')
    expect(parsePhone('+77031234567', { strict: true })).toEqual({ ok: false, error: 'prefix' })
    expect(parsePhone('+76001234567', { strict: true })).toEqual({ ok: false, error: 'prefix' })
    expect(parsePhone('+79161234567', { strict: true })).toEqual({ ok: false, error: 'country' })
    expect(parsePhone('+78001234567', { strict: true })).toEqual({ ok: false, error: 'country' })
  })

  it('strict accepts only +7… and 8… without separators', () => {
    expect(parsePhone('+77071234567', { strict: true }).ok).toBe(true)
    expect(parsePhone('87071234567', { strict: true }).ok).toBe(true)
    expect(parsePhone('77071234567', { strict: true })).toEqual({ ok: false, error: 'length' })
    expect(parsePhone('7071234567', { strict: true })).toEqual({ ok: false, error: 'length' })
    expect(parsePhone('0077071234567', { strict: true })).toEqual({ ok: false, error: 'length' })
    expect(parsePhone('+7 707 123 45 67', { strict: true })).toEqual({
      ok: false,
      error: 'format',
    })
  })

  it.each([
    ['+81312345678', 'country'],
    ['+12025550123', 'country'],
    ['0012025550123', 'country'],
    ['+7707123456', 'length'],
    ['+770712345678', 'length'],
    ['707123456', 'length'],
    ['97071234567', 'length'],
    ['', 'length'],
    ['+7 707 123 45 6x', 'format'],
    ['+', 'format'],
    ['++77071234567', 'format'],
    ['+78191234567', 'prefix'],
    ['+78301234567', 'prefix'],
  ])('%j → %s', (input, error) => {
    expect(parsePhone(input)).toEqual({ ok: false, error })
  })

  it('rejects non-strings from untyped callers', () => {
    expect(parsePhone(null as unknown as string)).toEqual({ ok: false, error: 'format' })
  })

  it('keeps 10-digit numbers starting with 00 or 810 as national numbers', () => {
    expect(info('0012345678').e164).toBe('+70012345678')
    expect(info('8101234567').e164).toBe('+78101234567')
  })

  it('every 10-digit number either parses to itself or fails with prefix', () => {
    fc.assert(
      fc.property(digitString(10), (nsn) => {
        const r = parsePhone(nsn)
        return r.ok ? r.value.e164 === `+7${nsn}` : r.error === 'prefix'
      }),
      { numRuns: 10_000 },
    )
  })

  it('isValidPhone mirrors parsePhone', () => {
    expect(isValidPhone('+7 707 123 45 67')).toBe(true)
    expect(isValidPhone('+7 707 123 45 67', { strict: true })).toBe(false)
  })
})

describe('formatPhone', () => {
  it.each([
    ['+77071234567', '+7 707 123 45 67', '8 (707) 123-45-67'],
    ['+77172123456', '+7 7172 12 34 56', '8 (7172) 12-34-56'],
    ['+77272123456', '+7 727 212 34 56', '8 (727) 212-34-56'],
    ['+77277212345', '+7 72772 1 23 45', '8 (72772) 1-23-45'],
    ['+79161234567', '+7 916 123 45 67', '8 (916) 123-45-67'],
  ])('%s', (input, international, national) => {
    const p = info(input)
    expect(formatPhone(p)).toBe(international)
    expect(formatPhone(p, 'international')).toBe(international)
    expect(formatPhone(p, 'national')).toBe(national)
    expect(formatPhone(p, 'e164')).toBe(input)
  })

  it('formatted output parses back to the same number', () => {
    fc.assert(
      fc.property(
        digitString(10),
        fc.constantFrom('international', 'national') as fc.Arbitrary<'national'>,
        (nsn, style) => {
          const r = parsePhone(nsn)
          return !r.ok || info(formatPhone(r.value, style)).e164 === r.value.e164
        },
      ),
      { numRuns: 10_000 },
    )
  })
})

describe('data/phone.json#localities', () => {
  const items = data.localities.items

  it('gives every locality a 10-digit national number', () => {
    for (const i of items) expect(i.code.length + i.subscriberDigits, i.itu).toBe(10)
  })

  it('lists every city the library resolves, and parsePhone agrees', () => {
    for (const l of data.landline) {
      expect(items.some((i) => i.code === l.areaCode)).toBe(true)
      expect(
        info(`8${l.nsnPattern.replace(/\[(\d)\d*\]/, '$1').replace(/X/g, '5')}`).areaCode,
      ).toBe(l.areaCode)
    }
  })
})
