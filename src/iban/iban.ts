import { stripSeparators } from '../core/digits'
import type { IBANError } from '../core/errors'
import { err, ok, type Result } from '../core/result'
import { BANKS } from './generated'

export interface Bank {
  /** 3-digit code assigned by the National Bank (IBAN positions 5–7). */
  code: string
  bic: string
  name: { ru: string; kk: string; en: string }
  /** False when the code or BIC is no longer in the NBRK directory. */
  active: boolean
}

export interface IBANInfo {
  /** 20 characters without separators, upper case. */
  value: string
  checkDigits: string
  bankCode: string
  /** 13-character account number inside the bank. */
  account: string
  bank?: Bank
}

export interface IBANOptions {
  /** No separator stripping or upper-casing; no I/O/Q in the account; bank must be active. */
  strict?: boolean
}

const toBank = ([code, bic, ru, kk, en, active]: (typeof BANKS)[number]): Bank => ({
  code,
  bic,
  name: { ru, kk, en },
  active: active === 1,
})

/**
 * Bank by 3-digit IBAN code or BIC; for a code the active holder wins over former ones.
 * @example
 * getBank('722')?.bic // 'CASPKZKA'
 */
export const getBank = (codeOrBic: string): Bank | undefined => {
  const rows = BANKS.filter(([code, bic]) => code === codeOrBic || bic === codeOrBic)
  const row = rows.find((r) => r[5]) ?? rows[0]
  return row && toBank(row)
}

// ISO 7064 MOD 97-10 over the rearranged IBAN, letters A=10 … Z=35.
const mod97 = (s: string): number => {
  let r = 0
  for (const ch of s.slice(4) + s.slice(0, 4)) {
    const v = Number.parseInt(ch, 36)
    r = (r * (v < 10 ? 10 : 100) + v) % 97
  }
  return r
}

/**
 * Check digits for a KZ IBAN body: 3-digit bank code + 13-character account, upper case.
 * @example
 * ibanCheckDigits('125KZT5004100100') // '86'
 */
export const ibanCheckDigits = (bban: string): string =>
  String(98 - mod97(`KZ00${bban}`)).padStart(2, '0')

const CHARS = /^[A-Z0-9]*$/
const SHAPE = /^KZ\d{5}/

/**
 * Parses a Kazakhstan IBAN: KZ, 2 check digits (MOD 97-10), 3-digit bank code, 13-char account.
 * @example
 * parseIBAN('KZ86 125K ZT50 0410 0100') // { ok: true, value: { value: 'KZ86125KZT5004100100', bankCode: '125', bank: { bic: 'NBRKKZKX', ... }, ... } }
 */
export const parseIBAN = (
  input: string,
  options: IBANOptions = {},
): Result<IBANInfo, IBANError> => {
  if (typeof input !== 'string') return err('format')
  const { strict } = options
  const s = strict ? input : stripSeparators(input).toUpperCase()
  if (!CHARS.test(s)) return err('format')
  if (s.length !== 20) return err('length')
  if (!s.startsWith('KZ')) return err('country')
  if (!SHAPE.test(s) || (strict && /[IOQ]/.test(s.slice(7)))) return err('format')
  const check = Number(s.slice(2, 4))
  // ISO 13616: check digits are 02–98; 01 and 99 would alias 98 and 02 under MOD 97.
  if (check < 2 || check > 98 || mod97(s) !== 1) return err('checksum')
  const bankCode = s.slice(4, 7)
  const bank = getBank(bankCode)
  if (strict && !bank?.active) return err('bank')
  const info: IBANInfo = { value: s, checkDigits: s.slice(2, 4), bankCode, account: s.slice(7) }
  if (bank) info.bank = bank
  return ok(info)
}

/**
 * True when `input` is a valid Kazakhstan IBAN (see {@link parseIBAN}).
 * @example
 * isValidIBAN('KZ86125KZT5004100100') // true
 */
export const isValidIBAN = (input: string, options?: IBANOptions): boolean =>
  parseIBAN(input, options).ok

/**
 * Paper format: groups of 4 characters (NBRK rules No. 207, appendix 2).
 * @example
 * formatIBAN(iban) // 'KZ86 125K ZT50 0410 0100'
 */
export const formatIBAN = (iban: IBANInfo): string => iban.value.replace(/.{4}(?!$)/g, '$& ')
