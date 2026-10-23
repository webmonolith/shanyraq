import type { Messages } from './types'

export const en: Messages = {
  iin: {
    format: 'IIN must contain digits only',
    length: 'IIN must be 12 digits long',
    date: 'IIN contains an invalid birth date',
    century: 'Invalid 7th digit of IIN (century and gender)',
    checksum: 'Invalid IIN check digit',
  },
  bin: {
    format: 'BIN must contain digits only',
    length: 'BIN must be 12 digits long',
    date: 'BIN contains an invalid registration year or month',
    entityType: 'Unknown legal entity type (5th digit of BIN)',
    divisionType: 'Unknown division type (6th digit of BIN)',
    checksum: 'Invalid BIN check digit',
  },
  taxid: {
    format: 'IIN/BIN must contain digits only',
    length: 'IIN/BIN must be 12 digits long',
    kind: 'The number looks like neither an IIN nor a BIN',
    checksum: 'Invalid IIN/BIN check digit',
  },
  phone: {
    format: 'Invalid phone number format',
    length: 'Invalid phone number length',
    country: 'Only Kazakhstan numbers (+7) are supported',
    prefix: 'Unknown operator or area code',
  },
  iban: {
    format: 'IBAN may contain only Latin letters and digits',
    length: 'A Kazakhstan IBAN is 20 characters long',
    country: 'IBAN must start with KZ',
    checksum: 'Invalid IBAN check digits',
    bank: 'Unknown or inactive bank code in IBAN',
  },
  plate: {
    format: 'Invalid license plate format',
    region: 'Unknown region code in license plate',
  },
  money: {
    invalid: 'Amount must be a finite number',
    range: 'Amount is out of the supported range (up to 999 trillion)',
  },
  date: {
    format: 'Invalid date format',
    date: 'This date does not exist',
  },
  calendar: {
    date: 'Invalid date, expected YYYY-MM-DD',
    range: 'Invalid date range or number of days',
    data: 'No Kurban ait or day-off transfer data for this year',
  },
  tax: {
    invalid: 'Enter the amount as a number',
    range: 'Amount, rate or month is out of range',
    data: 'No MRP, minimum wage or rate data for this year',
  },
  leave: {
    invalid: 'Enter the earnings as a number',
    range: 'Amount, number of days or period is out of range',
    date: 'Invalid date, expected YYYY-MM-DD',
    data: 'No MRP or calendar data for this year',
  },
  loan: {
    invalid: 'Enter the loan amount as a number',
    range: 'Amount, rate, term or payment is out of range',
    date: 'Invalid date, expected YYYY-MM-DD',
    data: 'No ГЭСВ cap data for this date',
  },
  deadlines: {
    range: 'Year is out of range',
    data: 'No working-day calendar data for this year',
  },
  alimony: {
    invalid: 'Enter the income as a number',
    range: 'Income, share, amount or number of children is out of range',
    date: 'Invalid date, expected YYYY-MM-DD',
    data: 'No tax rates or MRP for this year',
  },
  claim: {
    invalid: 'Enter the amount as a number',
    range: 'Amount, dates, rate or payments are out of range',
    date: 'Invalid date, expected YYYY-MM-DD',
    data: 'No base rate or MRP for this date',
  },
  family: {
    invalid: 'Enter the income as a number',
    range: 'Income, months, days or birth order is out of range',
    data: 'No MRP or MZP for this year',
  },
  vehicle: {
    invalid: 'Enter the engine volume, power, capacity or mass as a number',
    range: 'Year of manufacture or months are out of range',
    data: 'No MRP for this year',
  },
  property: {
    invalid: 'Enter the value or area as a number',
    range: 'Area, year, share, months or coefficient is out of range',
    data: 'No MRP for this or the previous year',
  },
  inheritance: {
    invalid: 'Enter the property value as a number',
    range: 'Number of heirs or value is out of range',
  },
  pension: {
    invalid: 'Enter the income as a number',
    range: 'Income, work record, gender or early retirement kind is out of range',
    date: 'Invalid date, expected YYYY-MM-DD',
    data: 'No subsistence minimum, MRP or minimum pension for this year',
  },
}
