import { z } from 'zod'
import { type BINOptions, parseBIN } from '../bin/bin'
import type { ErrorCodes } from '../core/errors'
import type { Result } from '../core/result'
import { binRu, ibanRu, iinRu, phoneRu, plateRu, taxidRu } from '../i18n/ru'
import type { Messages } from '../i18n/types'
import { type IBANOptions, parseIBAN } from '../iban/iban'
import { type IINOptions, parseIIN } from '../iin/iin'
import { parsePhone } from '../phone/phone'
import type { PhoneOptions } from '../phone/types'
import { type PlateOptions, parsePlate } from '../plate/plate'
import { parseTaxId, type TaxIdOptions } from '../taxid/taxid'

export interface SchemaOptions {
  /** Issue texts, e.g. `kk` or `en` from `shanyraq/i18n`; default `ru`. */
  messages?: Messages
  /** Overrides the message for every error code. */
  message?: string
}

const schema = <M extends keyof ErrorCodes, T>(
  module: M,
  parse: (input: string) => Result<T, ErrorCodes[M]>,
  output: (value: T) => string,
  { messages, message }: SchemaOptions,
  fallback: Messages[M],
) =>
  z.string().transform((input, ctx) => {
    const r = parse(input)
    if (r.ok) return output(r.value)
    ctx.addIssue({
      code: 'custom',
      input,
      message:
        message ?? ((messages?.[module] ?? fallback) as Record<ErrorCodes[M], string>)[r.error],
      params: { shanyraq: `${module}.${r.error}` },
    })
    return z.NEVER
  })

const value = (info: { value: string }) => info.value

/**
 * IIN string schema; outputs 12 digits without separators.
 * @example
 * z.object({ iin: iin({ messages: kk }) }).parse({ iin: '900101 300126' }) // { iin: '900101300126' }
 */
export const iin = (options: IINOptions & SchemaOptions = {}) =>
  schema('iin', (s) => parseIIN(s, options), value, options, iinRu)

/**
 * BIN string schema; outputs 12 digits without separators.
 * @example
 * bin().parse('180340021791') // '180340021791'
 */
export const bin = (options: BINOptions & SchemaOptions = {}) =>
  schema('bin', (s) => parseBIN(s, options), value, options, binRu)

/**
 * IIN-or-BIN string schema; outputs 12 digits without separators.
 * @example
 * taxId().parse('900101-300126') // '900101300126'
 */
export const taxId = (options: TaxIdOptions & SchemaOptions = {}) =>
  schema('taxid', (s) => parseTaxId(s, options), value, options, taxidRu)

/**
 * +7 phone schema; outputs E.164.
 * @example
 * phone({ strict: true }).parse('8 707 123 45 67') // '+77071234567'
 */
export const phone = (options: PhoneOptions & SchemaOptions = {}) =>
  schema(
    'phone',
    (s) => parsePhone(s, options),
    (p) => p.e164,
    options,
    phoneRu,
  )

/**
 * Kazakhstan IBAN schema; outputs 20 characters, upper case, without spaces.
 * @example
 * iban().parse('kz86 125k zt50 0410 0100') // 'KZ86125KZT5004100100'
 */
export const iban = (options: IBANOptions & SchemaOptions = {}) =>
  schema('iban', (s) => parseIBAN(s, options), value, options, ibanRu)

/**
 * Licence plate schema; outputs the canonical spelling.
 * @example
 * plate().parse('237blm01') // '237 BLM 01'
 */
export const plate = (options: PlateOptions & SchemaOptions = {}) =>
  schema('plate', (s) => parsePlate(s, options), value, options, plateRu)
