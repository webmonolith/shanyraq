import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { isValidIIN, parseIIN } from '../src/iin'
import { corrupt, digitString, id, withCheck } from './helpers'

describe('parseIIN', () => {
  it('decodes the pre-2013 structure', () => {
    expect(parseIIN('900101300126')).toEqual({
      ok: true,
      value: { value: '900101300126', birthDate: '1990-01-01', gender: 'male', century: 20 },
    })
  })

  it.each([
    ['1', 'male', 19, '1885-07-15'],
    ['2', 'female', 19, '1885-07-15'],
    ['3', 'male', 20, '1985-07-15'],
    ['4', 'female', 20, '1985-07-15'],
    ['5', 'male', 21, '2085-07-15'],
    ['6', 'female', 21, '2085-07-15'],
  ])('7th digit %s → %s, century %i', (digit, gender, century, birthDate) => {
    const r = parseIIN(id(`850715${digit}0001`))
    expect(r).toMatchObject({ ok: true, value: { gender, century, birthDate } })
  })

  it('strips separators unless strict', () => {
    expect(parseIIN('900101 300126').ok).toBe(true)
    expect(parseIIN('900-101-300-126').ok).toBe(true)
    expect(parseIIN('900101 300126', { strict: true })).toEqual({ ok: false, error: 'format' })
  })

  it.each([
    ['', 'length'],
    ['90010130012', 'length'],
    ['9001013001260', 'length'],
    ['90010130012a', 'format'],
    ['+900101300126', 'format'],
    ['900101300123', 'checksum'],
  ])('%j → %s', (input, error) => {
    expect(parseIIN(input)).toEqual({ ok: false, error })
  })

  it('rejects non-strings from untyped callers', () => {
    expect(parseIIN(900101300126 as unknown as string)).toEqual({ ok: false, error: 'format' })
  })

  it('reserved 7th digits 0, 7, 8, 9: valid but not decodable; strict → century', () => {
    for (const d of '0789') {
      const s = id(`900101${d}0001`)
      expect(parseIIN(s)).toEqual({ ok: true, value: { value: s } })
      expect(parseIIN(s, { strict: true })).toEqual({ ok: false, error: 'century' })
    }
  })

  it('impossible dates: valid but not decodable; strict → date', () => {
    for (const body of ['901301', '900001', '900100', '900132', '900431', '000229'].map(
      (d) => `${d}30001`,
    )) {
      const s = id(body)
      expect(parseIIN(s)).toEqual({ ok: true, value: { value: s } })
      expect(parseIIN(s, { strict: true })).toEqual({ ok: false, error: 'date' })
    }
  })

  it('handles leap years per century', () => {
    expect(parseIIN(id('00022950001'), { strict: true }).ok).toBe(true) // 2000
    expect(parseIIN(id('96022930001'), { strict: true }).ok).toBe(true) // 1996
    expect(parseIIN(id('00022930001'), { strict: true }).ok).toBe(false) // 1900
    expect(parseIIN(id('00022910001'), { strict: true }).ok).toBe(false) // 1800
  })

  it('checks the check digit before the structure', () => {
    expect(parseIIN(corrupt(id('99999990001')), { strict: true })).toEqual({
      ok: false,
      error: 'checksum',
    })
  })
})

describe('isValidIIN', () => {
  it('accepts any 11 digits with the right check digit', () => {
    fc.assert(
      fc.property(digitString(11), (body) => {
        const s = withCheck(body)
        return s === null || (isValidIIN(s) && !isValidIIN(corrupt(s)))
      }),
      { numRuns: 10_000 },
    )
  })

  it('strict accepts exactly the decodable subset', () => {
    fc.assert(
      fc.property(digitString(11), (body) => {
        const s = withCheck(body)
        if (s === null) return true
        const r = parseIIN(s)
        return r.ok && isValidIIN(s, { strict: true }) === (r.value.birthDate !== undefined)
      }),
    )
  })
})
