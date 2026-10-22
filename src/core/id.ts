import { isDigits, stripSeparators } from './digits'
import { err, ok, type Result } from './result'

/** Normalizes a 12-digit IIN/BIN; `strict` disables separator stripping. */
export const readId = (input: string, strict?: boolean): Result<string, 'format' | 'length'> => {
  if (typeof input !== 'string') return err('format')
  const s = strict ? input : stripSeparators(input)
  if (s && !isDigits(s)) return err('format')
  return s.length === 12 ? ok(s) : err('length')
}

export const daysInMonth = (year: number, month: number): number =>
  month === 2
    ? year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
      ? 29
      : 28
    : 30 + ((month + (month >> 3)) & 1)
