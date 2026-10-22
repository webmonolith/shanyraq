import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { checkDigit, hasValidCheckDigit } from '../../src/core'

// Independent reference: straight from the wording of MIA order No. 521, p. 2.
const reference = (s: string): number | null => {
  const d = [...s.slice(0, 11)].map(Number)
  const a = d.reduce((sum, x, i) => sum + x * (i + 1), 0) % 11
  if (a < 10) return a
  const w = [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2]
  const b = d.reduce((sum, x, i) => sum + x * (w[i] ?? 0), 0) % 11
  return b < 10 ? b : null
}

const elevenDigits = fc.string({
  unit: fc.constantFrom(...'0123456789'),
  minLength: 11,
  maxLength: 11,
})

describe('checkDigit', () => {
  it('first pass', () => {
    expect(checkDigit('90010130012')).toBe(6)
  })

  it('falls back to the second pass when the first yields 10', () => {
    expect(checkDigit('10000000020')).toBe(5)
  })

  it('returns null when both passes yield 10', () => {
    expect(checkDigit('10000000028')).toBeNull()
  })

  it('ignores digits beyond the 11th', () => {
    expect(checkDigit('900101300129')).toBe(6)
  })

  it('matches the reference implementation', () => {
    fc.assert(
      fc.property(elevenDigits, (s) => checkDigit(s) === reference(s)),
      { numRuns: 10_000 },
    )
  })
})

describe('hasValidCheckDigit', () => {
  it('accepts correct and rejects wrong check digits', () => {
    expect(hasValidCheckDigit('900101300126')).toBe(true)
    expect(hasValidCheckDigit('900101300123')).toBe(false)
    expect(hasValidCheckDigit('100000000205')).toBe(true)
  })

  it('rejects every 12th digit for never-issued numbers', () => {
    for (let d = 0; d <= 9; d++) expect(hasValidCheckDigit(`10000000028${d}`)).toBe(false)
  })

  it('round-trips: appending checkDigit always validates', () => {
    fc.assert(
      fc.property(elevenDigits, (s) => {
        const c = checkDigit(s)
        return c === null || hasValidCheckDigit(s + c)
      }),
      { numRuns: 10_000 },
    )
  })

  it('exactly one 12th digit is valid unless the number is never issued', () => {
    fc.assert(
      fc.property(elevenDigits, (s) => {
        const valid = [...'0123456789'].filter((d) => hasValidCheckDigit(s + d)).length
        return valid === (checkDigit(s) === null ? 0 : 1)
      }),
    )
  })
})
