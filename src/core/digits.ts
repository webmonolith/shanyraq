// Whitespace (incl. NBSP, thin and narrow spaces), ASCII/Unicode dashes, dots, slashes and brackets.
const SEPARATORS = /[\s    \-‐-―−.()/[\]]/g
const DIGITS = /^\d+$/

/** Removes separators people commonly type inside identifiers. */
export const stripSeparators = (input: string): string => input.replace(SEPARATORS, '')

export const isDigits = (input: string): boolean => DIGITS.test(input)
