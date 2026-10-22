/** Operator that originally received the DEF code; the subscriber may have ported away (MNP). */
export type Operator = 'kcell' | 'beeline' | 'tele2-altel'

/** `ambiguous`: +7 1xx, 800–809, 881–899 are shared by KZ and RU (2025 agreement). */
export type PhoneCountry = 'KZ' | 'RU' | 'ambiguous'

/** `other`: KZ non-geographic, non-mobile codes (750, 751, 753, 760, 763, 790). */
export type PhoneType = 'mobile' | 'landline' | 'other' | 'unknown'

export type PhoneFormat = 'e164' | 'international' | 'national'

export interface City {
  ru: string
  kk: string
  en: string
}

export interface PhoneInfo {
  /** `+77071234567` */
  e164: string
  /** 10-digit national significant number. */
  nsn: string
  /** First 3 digits of the NSN (ABC/DEF code). */
  ndc: string
  country: PhoneCountry
  type: PhoneType
  originalOperator?: Operator
  /** Dialled area code incl. locality digits (`7172`, `727`, `72772`), known cities only. */
  areaCode?: string
  city?: City
}

export interface PhoneOptions {
  /** No separator stripping, only `+7…`/`8…` forms, KZ codes in use only. */
  strict?: boolean
}
