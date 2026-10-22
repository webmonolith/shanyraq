import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { err, isDigits, ok, stripSeparators } from '../../src/core'

describe('stripSeparators', () => {
  it.each([
    ['8 (707) 123-45-67', '87071234567'],
    ['+7\u00a0707\u202f123\u200945\u201367', '+77071234567'],
    ['9001\t0130\n0126', '900101300126'],
    ['KZ12 3456.7890/12[34]', 'KZ12345678901234'],
    ['−12', '12'],
    ['', ''],
  ])('%j → %j', (input, expected) => {
    expect(stripSeparators(input)).toBe(expected)
  })

  it('is idempotent', () => {
    fc.assert(
      fc.property(fc.string(), (s) => stripSeparators(stripSeparators(s)) === stripSeparators(s)),
    )
  })

  it('keeps alphanumerics intact', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[0-9A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІі+]*$/),
        (s) => stripSeparators(s) === s,
      ),
    )
  })
})

describe('isDigits', () => {
  it('accepts ASCII digit strings only', () => {
    expect(isDigits('0123456789')).toBe(true)
    expect(isDigits('')).toBe(false)
    expect(isDigits('12a')).toBe(false)
    expect(isDigits('١٢٣')).toBe(false)
    expect(isDigits(' 1')).toBe(false)
  })
})

describe('Result helpers', () => {
  it('build tagged unions', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 })
    expect(err('format')).toEqual({ ok: false, error: 'format' })
  })
})
