const PASS_1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const PASS_2 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2]

const weighted = (digits: string, weights: number[]): number => {
  let sum = 0
  for (let i = 0; i < 11; i++) sum += (digits.charCodeAt(i) - 48) * (weights[i] as number)
  return sum % 11
}

/**
 * IIN/BIN check digit for the first 11 digits (MIA order No. 521 of 29.06.2023, p. 2).
 * Returns null when both passes yield 10: such numbers are never issued.
 */
export const checkDigit = (digits: string): number | null => {
  const first = weighted(digits, PASS_1)
  if (first !== 10) return first
  const second = weighted(digits, PASS_2)
  return second === 10 ? null : second
}

/** Validates the 12th digit of a 12-digit IIN/BIN string. */
export const hasValidCheckDigit = (digits: string): boolean =>
  checkDigit(digits) === digits.charCodeAt(11) - 48
