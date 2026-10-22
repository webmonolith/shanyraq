# shanyraq

Zero-dependency, tree-shakeable TypeScript utilities for Kazakhstan: IIN/BIN, phone numbers, IBAN, amounts in words, licence plates, regions, holidays and working days, dates, Kazakh Latin script.

[Русская версия](README.ru.md) · [Online tools](https://shanyraq.webmonolith.kz)

- **Sourced, not guessed.** Every rule and dataset (`data/*.json`) links to the law, order or registry it comes from, with a retrieval date.
- **Small.** Each subpath is ≤ 2 kB gzip (data modules like `iban` and `calendar` slightly more); import only what you use.
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

### Error messages

```ts
import { getMessage } from 'shanyraq/i18n'

getMessage('kk', 'iin', 'checksum') // 'ЖСН-нің бақылау цифры қате'
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
| `shanyraq/tax` | 2026 payroll (ИПН, ОПВ, ВОСМС, ОПВР, СО, ООСМС, СН), gross ↔ net, VAT, MRP/MZP |
| `shanyraq/calendar` | Holidays, days off, working-day arithmetic |
| `shanyraq/date` | Official date formats (ru, kk), parsing |
| `shanyraq/translit` | Kazakh Cyrillic → Latin (2021 and 2018 alphabets) |
| `shanyraq/plate` | Licence plates (2012+ standard) |
| `shanyraq/regions` | Regions with KATO and plate codes |
| `shanyraq/i18n` | Error messages in ru, kk, en |
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
