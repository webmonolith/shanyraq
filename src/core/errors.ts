export type IINError = 'format' | 'length' | 'date' | 'century' | 'checksum'
export type BINError = 'format' | 'length' | 'date' | 'entityType' | 'divisionType' | 'checksum'
export type TaxIdError = 'format' | 'length' | 'kind' | 'checksum'
export type PhoneError = 'format' | 'length' | 'country' | 'prefix'
export type IBANError = 'format' | 'length' | 'country' | 'checksum' | 'bank'
export type PlateError = 'format' | 'region'
export type MoneyError = 'invalid' | 'range'
export type DateError = 'format' | 'date'
export type CalendarError = 'date' | 'range' | 'data'
export type TaxError = 'invalid' | 'range' | 'data'
export type LeaveError = 'invalid' | 'range' | 'date' | 'data'
export type LoanError = 'invalid' | 'range' | 'date' | 'data'
export type DeadlinesError = 'range' | 'data'
export type AlimonyError = 'invalid' | 'range' | 'date' | 'data'
export type ClaimError = 'invalid' | 'range' | 'date' | 'data'
export type FamilyError = 'invalid' | 'range' | 'data'
export type VehicleError = 'invalid' | 'range' | 'data'
export type PropertyError = 'invalid' | 'range' | 'data'
export type InheritanceError = 'invalid' | 'range'
export type PensionError = 'invalid' | 'range' | 'date' | 'data'
export type CustomsError = 'invalid' | 'range' | 'date'

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
  tax: TaxError
  leave: LeaveError
  loan: LoanError
  deadlines: DeadlinesError
  alimony: AlimonyError
  claim: ClaimError
  family: FamilyError
  vehicle: VehicleError
  property: PropertyError
  inheritance: InheritanceError
  pension: PensionError
  customs: CustomsError
}
