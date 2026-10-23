import type { ErrorCodes } from '../core/errors'
import {
  alimonyEn,
  binEn,
  calendarEn,
  claimEn,
  customsEn,
  dateEn,
  deadlinesEn,
  en,
  familyEn,
  ibanEn,
  iinEn,
  inheritanceEn,
  leaveEn,
  loanEn,
  moneyEn,
  pensionEn,
  phoneEn,
  plateEn,
  propertyEn,
  taxEn,
  taxidEn,
  vehicleEn,
} from './en'
import {
  alimonyKk,
  binKk,
  calendarKk,
  claimKk,
  customsKk,
  dateKk,
  deadlinesKk,
  familyKk,
  ibanKk,
  iinKk,
  inheritanceKk,
  kk,
  leaveKk,
  loanKk,
  moneyKk,
  pensionKk,
  phoneKk,
  plateKk,
  propertyKk,
  taxidKk,
  taxKk,
  vehicleKk,
} from './kk'
import {
  alimonyRu,
  binRu,
  calendarRu,
  claimRu,
  customsRu,
  dateRu,
  deadlinesRu,
  familyRu,
  ibanRu,
  iinRu,
  inheritanceRu,
  leaveRu,
  loanRu,
  moneyRu,
  pensionRu,
  phoneRu,
  plateRu,
  propertyRu,
  ru,
  taxidRu,
  taxRu,
  vehicleRu,
} from './ru'
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

// One object per module: importing `pensionMessages` bundles only the pension texts.
/**
 * IIN error texts in ru, kk and en.
 * @example
 * iinMessages.kk.format // 'ЖСН тек цифрлардан тұруы керек'
 */
export const iinMessages: { [L in Lang]: Messages['iin'] } = { ru: iinRu, kk: iinKk, en: iinEn }

/**
 * BIN error texts in ru, kk and en.
 * @example
 * binMessages.kk.format // 'БСН тек цифрлардан тұруы керек'
 */
export const binMessages: { [L in Lang]: Messages['bin'] } = { ru: binRu, kk: binKk, en: binEn }

/**
 * IIN/BIN error texts in ru, kk and en.
 * @example
 * taxidMessages.kk.format // 'ЖСН/БСН тек цифрлардан тұруы керек'
 */
export const taxidMessages: { [L in Lang]: Messages['taxid'] } = {
  ru: taxidRu,
  kk: taxidKk,
  en: taxidEn,
}

/**
 * Phone error texts in ru, kk and en.
 * @example
 * phoneMessages.kk.format // 'Телефон нөмірінің пішімі қате'
 */
export const phoneMessages: { [L in Lang]: Messages['phone'] } = {
  ru: phoneRu,
  kk: phoneKk,
  en: phoneEn,
}

/**
 * IBAN error texts in ru, kk and en.
 * @example
 * ibanMessages.kk.format // 'IBAN тек латын әріптері мен цифрлардан тұруы керек'
 */
export const ibanMessages: { [L in Lang]: Messages['iban'] } = {
  ru: ibanRu,
  kk: ibanKk,
  en: ibanEn,
}

/**
 * Licence plate error texts in ru, kk and en.
 * @example
 * plateMessages.kk.format // 'Мемлекеттік нөмірдің пішімі қате'
 */
export const plateMessages: { [L in Lang]: Messages['plate'] } = {
  ru: plateRu,
  kk: plateKk,
  en: plateEn,
}

/**
 * Amount in words error texts in ru, kk and en.
 * @example
 * moneyMessages.kk.invalid // 'Сома шекті сан болуы керек'
 */
export const moneyMessages: { [L in Lang]: Messages['money'] } = {
  ru: moneyRu,
  kk: moneyKk,
  en: moneyEn,
}

/**
 * Date error texts in ru, kk and en.
 * @example
 * dateMessages.kk.format // 'Күн пішімі қате'
 */
export const dateMessages: { [L in Lang]: Messages['date'] } = {
  ru: dateRu,
  kk: dateKk,
  en: dateEn,
}

/**
 * Calendar error texts in ru, kk and en.
 * @example
 * calendarMessages.kk.date // 'Күн қате, ЖЖЖЖ-АА-КК пішімі күтіледі'
 */
export const calendarMessages: { [L in Lang]: Messages['calendar'] } = {
  ru: calendarRu,
  kk: calendarKk,
  en: calendarEn,
}

/**
 * Tax error texts in ru, kk and en.
 * @example
 * taxMessages.kk.invalid // 'Соманы санмен енгізіңіз'
 */
export const taxMessages: { [L in Lang]: Messages['tax'] } = { ru: taxRu, kk: taxKk, en: taxEn }

/**
 * Leave and sick pay error texts in ru, kk and en.
 * @example
 * leaveMessages.kk.invalid // 'Табыс сомасын санмен енгізіңіз'
 */
export const leaveMessages: { [L in Lang]: Messages['leave'] } = {
  ru: leaveRu,
  kk: leaveKk,
  en: leaveEn,
}

/**
 * Loan error texts in ru, kk and en.
 * @example
 * loanMessages.kk.invalid // 'Қарыз сомасын санмен енгізіңіз'
 */
export const loanMessages: { [L in Lang]: Messages['loan'] } = {
  ru: loanRu,
  kk: loanKk,
  en: loanEn,
}

/**
 * Tax calendar error texts in ru, kk and en.
 * @example
 * deadlinesMessages.kk.range // 'Жыл рұқсат етілген ауқымнан тыс'
 */
export const deadlinesMessages: { [L in Lang]: Messages['deadlines'] } = {
  ru: deadlinesRu,
  kk: deadlinesKk,
  en: deadlinesEn,
}

/**
 * Alimony error texts in ru, kk and en.
 * @example
 * alimonyMessages.kk.invalid // 'Табысты санмен енгізіңіз'
 */
export const alimonyMessages: { [L in Lang]: Messages['alimony'] } = {
  ru: alimonyRu,
  kk: alimonyKk,
  en: alimonyEn,
}

/**
 * Claim and penalty error texts in ru, kk and en.
 * @example
 * claimMessages.kk.invalid // 'Соманы санмен енгізіңіз'
 */
export const claimMessages: { [L in Lang]: Messages['claim'] } = {
  ru: claimRu,
  kk: claimKk,
  en: claimEn,
}

/**
 * Family benefits error texts in ru, kk and en.
 * @example
 * familyMessages.kk.invalid // 'Табысты санмен енгізіңіз'
 */
export const familyMessages: { [L in Lang]: Messages['family'] } = {
  ru: familyRu,
  kk: familyKk,
  en: familyEn,
}

/**
 * Vehicle error texts in ru, kk and en.
 * @example
 * vehicleMessages.kk.invalid // 'Көлемді, қуатты, жүк көтергіштікті немесе массаны санмен енгізіңіз'
 */
export const vehicleMessages: { [L in Lang]: Messages['vehicle'] } = {
  ru: vehicleRu,
  kk: vehicleKk,
  en: vehicleEn,
}

/**
 * Property tax error texts in ru, kk and en.
 * @example
 * propertyMessages.kk.invalid // 'Құнын немесе ауданын санмен енгізіңіз'
 */
export const propertyMessages: { [L in Lang]: Messages['property'] } = {
  ru: propertyRu,
  kk: propertyKk,
  en: propertyEn,
}

/**
 * Inheritance error texts in ru, kk and en.
 * @example
 * inheritanceMessages.kk.invalid // 'Мүлік құнын санмен енгізіңіз'
 */
export const inheritanceMessages: { [L in Lang]: Messages['inheritance'] } = {
  ru: inheritanceRu,
  kk: inheritanceKk,
  en: inheritanceEn,
}

/**
 * Pension error texts in ru, kk and en.
 * @example
 * pensionMessages.kk.invalid // 'Табысты санмен енгізіңіз'
 */
export const pensionMessages: { [L in Lang]: Messages['pension'] } = {
  ru: pensionRu,
  kk: pensionKk,
  en: pensionEn,
}

/**
 * Customs error texts in ru, kk and en.
 * @example
 * customsMessages.kk.invalid // 'Құнды, қозғалтқыш көлемін және еуро бағамын санмен енгізіңіз'
 */
export const customsMessages: { [L in Lang]: Messages['customs'] } = {
  ru: customsRu,
  kk: customsKk,
  en: customsEn,
}
