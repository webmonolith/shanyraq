import { type BINInfo, type BINOptions, parseBIN } from '../bin/bin'
import { hasValidCheckDigit } from '../core/checksum'
import type { TaxIdError } from '../core/errors'
import { readId } from '../core/id'
import { err, ok, type Result } from '../core/result'
import { type IINInfo, type IINOptions, parseIIN } from '../iin/iin'

export type TaxIdInfo = ({ kind: 'iin' } & IINInfo) | ({ kind: 'bin' } & BINInfo)

export type TaxIdOptions = IINOptions & BINOptions

/**
 * Parses an IIN or a BIN. A 5th digit of 0–3 means IIN: guaranteed only on the BIN side
 * (BINs never use 0–3), for IINs it is issuing practice.
 * @example
 * parseTaxId('180340021791') // { ok: true, value: { kind: 'bin', ... } }
 */
export const parseTaxId = (
  input: string,
  options: TaxIdOptions = {},
): Result<TaxIdInfo, TaxIdError> => {
  const id = readId(input, options.strict)
  if (!id.ok) return id
  const s = id.value
  if (!hasValidCheckDigit(s)) return err('checksum')
  if (s.charCodeAt(4) <= 51) {
    const iin = parseIIN(s, options)
    return iin.ok ? ok({ kind: 'iin', ...iin.value }) : err('kind')
  }
  const bin = parseBIN(s, options)
  return bin.ok ? ok({ kind: 'bin', ...bin.value }) : err('kind')
}

/**
 * True when `input` is a valid IIN or BIN.
 * @example
 * isValidTaxId('900101300126') // true
 */
export const isValidTaxId = (input: string, options?: TaxIdOptions): boolean =>
  parseTaxId(input, options).ok
