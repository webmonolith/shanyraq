export type IINError = 'format' | 'length' | 'date' | 'century' | 'checksum'
export type BINError = 'format' | 'length' | 'date' | 'entityType' | 'divisionType' | 'checksum'
export type TaxIdError = 'format' | 'length' | 'kind' | 'checksum'
export type PhoneError = 'format' | 'length' | 'country' | 'prefix'
export type IBANError = 'format' | 'length' | 'country' | 'checksum' | 'bank'
export type PlateError = 'format' | 'region'
export type MoneyError = 'invalid' | 'range'
export type DateError = 'format' | 'date'
export type CalendarError = 'date' | 'range' | 'data'

/** Every error code of every module, keyed by module name. */
export interface ErrorCodes {
  iin: IINError
  bin: BINError
  taxid: TaxIdError
  phone: PhoneError
  iban: IBANError
  plate: PlateError
  money: MoneyError
  date: DateError
  calendar: CalendarError
}
