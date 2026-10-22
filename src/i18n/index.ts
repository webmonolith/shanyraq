import type { ErrorCodes } from '../core/errors'
import { en } from './en'
import { kk } from './kk'
import { ru } from './ru'
import type { Lang, Messages } from './types'

export type { Lang, Messages }
export { en, kk, ru }

export const messages: Record<Lang, Messages> = { ru, kk, en }

/**
 * Human-readable text for an error code.
 * @example
 * getMessage('kk', 'iin', 'checksum') // 'ЖСН-нің бақылау цифры қате'
 */
export const getMessage = <M extends keyof ErrorCodes>(
  lang: Lang,
  module: M,
  code: ErrorCodes[M],
): string => (messages[lang][module] as Record<ErrorCodes[M], string>)[code]
