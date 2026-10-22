import fc from 'fast-check'
import { checkDigit } from '../src/core'

/** Appends the check digit; null for never-issued bodies. */
export const withCheck = (body: string): string | null => {
  const c = checkDigit(body)
  return c === null ? null : body + c
}

/** Like withCheck, but for fixtures that must exist. */
export const id = (body: string): string => {
  const s = withCheck(body)
  if (s === null) throw new Error(`never-issued body ${body}`)
  return s
}

/** Valid check digit replaced with a wrong one. */
export const corrupt = (s: string): string => s.slice(0, 11) + ((Number(s[11]) + 1) % 10)

export const digitString = (length: number) =>
  fc.string({ unit: fc.constantFrom(...'0123456789'), minLength: length, maxLength: length })
