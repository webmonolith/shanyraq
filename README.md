# shanyraq

Zero-dependency, tree-shakeable TypeScript utilities for Kazakhstan.

- **Validation:** IIN/BIN, phone numbers and city codes, IBAN and banks, licence plates, regions (KATO).
- **Payroll and benefits:** salary taxes, vacation and sick pay, dismissal payout, maternity and childcare, pension, alimony.
- **Taxes and loans:** VAT, simplified regime (910), tax calendar, tax penalty, vehicle and property tax, registration and recycling fees, car import duty for individuals, loan schedules with the effective rate (ГЭСВ).
- **Courts and law:** procedural deadlines, contractual penalty under Civil Code art. 353, court duty, inheritance shares.
- **Text:** amounts in words, official date formats, holidays and working days, Kazakh Latin script.

[Русская версия](README.ru.md) · [Online tools](https://shanyraq.webmonolith.kz) (81 pages in Russian and Kazakh, built on this package)

- **Sourced, not guessed.** Every rule and dataset (`data/*.json`) links to the law, order or registry it comes from, with a retrieval date. What could not be verified is listed in each dataset's `unverified`.
- **Small.** Most subpaths are ≤ 2 kB gzip; modules that carry data (banks, calendar, deadlines, leave) are up to 4 kB. Import only what you use.
- **Predictable.** Pure functions, no `throw`, no global state. Parsers return `{ ok: true, value } | { ok: false, error }`.
- **Three languages.** Error messages and formatting in Russian, Kazakh and English.
- **Batteries.** zod schemas, a seeded faker for test data and a CLI.

> Status: pre-release. The package is not on npm yet; the API may still change before 1.0.

## Install

```sh
npm i shanyraq
```

Node ≥ 18, any modern bundler; ESM and CommonJS builds.

## Usage

### IIN / BIN

```ts
import { parseIIN, isValidIIN } from 'shanyraq/iin'
import { parseBIN } from 'shanyraq/bin'
import { parseTaxId } from 'shanyraq/taxid'

parseIIN('900101 300126')
// { ok: true, value: { value: '900101300126', birthDate: '1990-01-01', gender: 'male', century: 20 } }

isValidIIN('900101300126') // true

parseBIN('180340021791')
// { ok: true, value: { registered: { yy: 18, month: 3 }, entityType: 'resident', divisionType: 'head', ... } }

parseTaxId('180340021791') // { ok: true, value: { kind: 'bin', ... } }
```

Since 2013 the law no longer guarantees that an IIN starts with the birth date, so `birthDate` and `gender` are returned only when they can be decoded. Pass `{ strict: true }` to require it.

### Phone

```ts
import { parsePhone, formatPhone } from 'shanyraq/phone'

const r = parsePhone('8 (707) 123-45-67')
// { ok: true, value: { e164: '+77071234567', country: 'KZ', type: 'mobile', originalOperator: 'tele2-altel', ... } }

if (r.ok) formatPhone(r.value, 'national') // '8 (707) 123-45-67'
```

`+7` is shared with Russia; the country is detected by numbering range. `originalOperator` is the operator the code was assigned to (numbers can be ported).

### IBAN and banks

```ts
import { parseIBAN, formatIBAN, getBank } from 'shanyraq/iban'

parseIBAN('KZ86 125K ZT50 0410 0100')
// { ok: true, value: { value: 'KZ86125KZT5004100100', bankCode: '125', bank: { bic: 'NBRKKZKX', ... } } }

getBank('722')?.bic // 'CASPKZKA'
```

### Amount in words

```ts
import { moneyToWords } from 'shanyraq/money'

moneyToWords(1234.5)
// { ok: true, value: 'Одна тысяча двести тридцать четыре теңге 50 тиынов' }
moneyToWords(1234.5, { lang: 'kk' })
// { ok: true, value: 'Бір мың екі жүз отыз төрт теңге 50 тиын' }
```

### Holidays and working days

```ts
import { isDayOff, countWorkingDays, addWorkingDays, getDaysOff } from 'shanyraq/calendar'

isDayOff('2026-03-24') // true — Nauryz fell on a weekend, the day off moved
countWorkingDays('2026-03-01', '2026-03-31') // { ok: true, value: 18 }
addWorkingDays('2026-12-15', 1) // { ok: true, value: '2026-12-17' }
```

Holidays, weekend shifts and Labour Ministry transfers are built in for 2024–2027; pass `options.years` to add or override a year.

### Licence plates and regions

```ts
import { parsePlate } from 'shanyraq/plate'
import { regionByKato, regionByPlateCode } from 'shanyraq/regions'

parsePlate('237blm01')
// { ok: true, value: { value: '237 BLM 01', type: 'individual', regionCode: '01', regionId: 'astana' } }

regionByPlateCode('02')?.id // 'almaty'
regionByKato('751110000')?.id // 'almaty'
```

### Dates and Latin script

```ts
import { formatDate } from 'shanyraq/date'
import { toLatin } from 'shanyraq/translit'

formatDate('2026-10-22') // { ok: true, value: '22 октября 2026 года' }
formatDate('2026-10-22', { lang: 'kk' }) // { ok: true, value: '2026 жылғы 22 қазан' }

toLatin('Қазақстан Республикасы') // 'Qazaqstan Respublikasy'
toLatin('Қазақстан', { scheme: '2018' })
```

### Salary and taxes

```ts
import { calculateSalary, grossFromNet, addVAT, simplifiedTax } from 'shanyraq/tax'
import { taxDeadlines } from 'shanyraq/deadlines'
import { taxPenalty } from 'shanyraq/claim'

calculateSalary(500000)
// { ok: true, value: { gross: 500000, opv: 50000, vosms: 10000, ipn: 31025, net: 408975, employerCost: 581400, ... } }
grossFromNet(400000) // gross 488 668
addVAT(100000) // { net: 100000, vat: 16000, gross: 116000 }

taxDeadlines(2026, { regime: 'simplified' })
// [{ id: 'ipnAgent', due: '2026-01-25', date: '2026-01-26', moved: true, ... }, ...]
taxPenalty(100000, '2026-04-10', '2026-05-10') // penalty 1 849.32 at 1.25 × base rate
```

Rates are for 2026 (Tax Code No. 214-VIII, Social Code, budget law); pass `year` where a function takes it.

### Leave, benefits and pension

```ts
import { vacationPay, sickPay, dismissalPay } from 'shanyraq/leave'
import { maternityPay, childcarePay } from 'shanyraq/family'
import { retirementAge, agePension } from 'shanyraq/pension'
import { alimony } from 'shanyraq/alimony'

vacationPay(6000000, '2026-07-01', 24)
// { ok: true, value: { end: '2026-07-25', holidays: ['2026-07-06'], dailyWage: 24390.24, pay: 414634.08, ... } }
maternityPay(400000) // 126 days → 1 512 000, 1 360 800 after ОПВ
childcarePay(400000) // 40 % of the average, 144 000 a month
retirementAge('1970-05-01', 'female') // { age: 63, date: '2033-05-01' }
alimony(500000, { children: 2 }) // a third of net pay
```

### Loans

```ts
import { loanSchedule, effectiveRate, gesvLimit } from 'shanyraq/loan'

loanSchedule(20000000, 7, 300) // 7-20-25 mortgage
// { ok: true, value: { monthly: 141355.84, overpayment: 22406751.7, apr: 7.23, ... } }
gesvLimit('mortgage', '2026-10-23') // { ok: true, value: 25 } — legal cap on the effective rate
```

### Courts and law

```ts
import { procedureTerm } from 'shanyraq/procedure'
import { claimPenalty, claimDuty } from 'shanyraq/claim'
import { inheritanceShares } from 'shanyraq/inheritance'

procedureTerm('2026-10-23', 'appeal') // { start: '2026-10-24', due: '2026-11-23', ... }
claimPenalty(1000000, '2026-01-31', '2026-10-01') // 243 days at the NBRK base rate → 108 184.93
claimDuty(5000000) // { percent: 1, duty: 50000, capped: false }
inheritanceShares({ spouse: true, children: 2 }, { estate: 30000000 })
// spouse and each child 1/3 — 10 000 000 each
```

The NBRK base-rate history is built in; results after the next scheduled decision come back with `stale: true`.

### Vehicles and property

```ts
import { vehicleTax, registrationFee, recyclingFee } from 'shanyraq/vehicle'
import { propertyTax, landTax } from 'shanyraq/property'
import { personalCarDuty } from 'shanyraq/customs'

vehicleTax('car', { volume: 2000, made: 2018 }) // 3 MRP + 7 ₸ per cc over 1 500 → 16 475
registrationFee('car', 2018) // 500 MRP → 2 162 500
propertyTax(30000000) // 96 600
personalCarDuty(20000, { volume: 1998, made: '2024-05-01', declared: '2026-10-23', eur: 500 })
// up to 3 years: 48 % of the value but at least 5.5 € per cc → 10 989 € = 5 494 500 ₸
```

### Error messages

```ts
import { getMessage } from 'shanyraq/i18n'

getMessage('kk', 'iin', 'checksum') // 'ЖСН-нің бақылау цифры қате'
```

`getMessage`, `ru`, `kk`, `en` and `messages` carry every module's texts. To bundle only what you use, import one module's object:

```ts
import { pensionMessages } from 'shanyraq/i18n'

pensionMessages.kk.range // only the pension texts, in ru, kk and en
```

### zod

```ts
import { z } from 'zod'
import { iin, phone, iban } from 'shanyraq/zod'
import { kk } from 'shanyraq/i18n'

const Form = z.object({
  iin: iin({ messages: kk }), // '900101 300126' → '900101300126'
  phone: phone(), // → E.164
  iban: iban(), // → upper case, no spaces
})
```

`zod ^4` is an optional peer dependency.

### Test data

```ts
import { createFaker } from 'shanyraq/faker'

const fake = createFaker(42) // same seed, same sequence
fake.iin({ gender: 'female' }) // passes isValidIIN(…, { strict: true })
```

### CLI

```sh
npx shanyraq iin 900101300126
npx shanyraq phone "8 707 123 45 67" --json
npx shanyraq workdays 2026-03-01 2026-03-31
npx shanyraq words 1234.50 --lang kk
npx shanyraq fake iban --count 5 --seed 1
```

Values can also come from stdin, one per line. Exit code is 1 when any value is invalid.

## Modules

| Subpath | What it does |
| --- | --- |
| `shanyraq/iin` | IIN: check digit, birth date, gender |
| `shanyraq/bin` | BIN: entity and division type, registration month |
| `shanyraq/taxid` | IIN or BIN |
| `shanyraq/phone` | +7 numbers: country, mobile operator, city, formatting |
| `shanyraq/iban` | KZ IBAN, bank directory by code and BIC |
| `shanyraq/money` | Amounts in words (ru, kk), amount parsing |
| `shanyraq/tax` | 2026 payroll (ИПН, ОПВ, ВОСМС, ОПВР, СО, ООСМС, СН), gross ↔ net, VAT, MRP/MZP, simplified regime (910) |
| `shanyraq/deadlines` | Tax calendar: filing and payment deadlines by regime, moved off days off |
| `shanyraq/leave` | Vacation pay, sick pay, dismissal payout (average daily wage) |
| `shanyraq/family` | Maternity and childcare payments, birth and care allowances |
| `shanyraq/pension` | Retirement age, basic and solidarity pension, pension contributions |
| `shanyraq/alimony` | Alimony by share or fixed MRP, late-payment penalty |
| `shanyraq/loan` | Annuity and differentiated schedules, prepayments, effective rate (ГЭСВ), legal caps |
| `shanyraq/procedure` | Procedural deadlines (Civil Procedure Code) |
| `shanyraq/claim` | NBRK base rate, penalty under Civil Code art. 353, court duty, tax penalty |
| `shanyraq/inheritance` | Shares of heirs by law, spouse's half, obligatory share |
| `shanyraq/vehicle` | Vehicle tax, first registration fee, recycling fee |
| `shanyraq/property` | Property value, property tax, land tax |
| `shanyraq/customs` | Single customs payment for a car imported by an individual (EEC decision No. 107) |
| `shanyraq/calendar` | Holidays, days off, working-day arithmetic |
| `shanyraq/date` | Official date formats (ru, kk), parsing |
| `shanyraq/translit` | Kazakh Cyrillic → Latin (2021 and 2018 alphabets) |
| `shanyraq/plate` | Licence plates (2012+ standard) |
| `shanyraq/regions` | Regions with KATO and plate codes |
| `shanyraq/i18n` | Error messages in ru, kk, en; per-module objects (`pensionMessages`, …) |
| `shanyraq/zod` | zod schemas |
| `shanyraq/faker` | Seeded valid test data |

## Development

```sh
npm ci
npm test            # vitest
npm run coverage    # ≥ 95% enforced
npm run lint        # biome
npm run build && npm run size
```

The playground site lives in `playground/` (`cd playground && npm i && npm run dev`).

Found outdated data — a new bank, a holiday transfer, an operator code? Open an issue with a link to the official source.

## License

MIT
