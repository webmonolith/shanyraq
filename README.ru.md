# shanyraq

TypeScript-утилиты для Казахстана без зависимостей: ИИН/БИН, телефоны, IBAN, сумма прописью, госномера, регионы, праздники и рабочие дни, даты, казахская латиница.

[English](README.md) · [Онлайн-инструменты](https://shanyraq.webmonolith.kz)

- **Факты с источниками.** Каждое правило и справочник (`data/*.json`) ссылается на закон, приказ или реестр, откуда взято, с датой проверки.
- **Маленький размер.** Каждый подмодуль ≤ 2 кБ gzip (модули с данными, `iban` и `calendar`, чуть больше); импортируйте только нужное.
- **Предсказуемость.** Чистые функции, без `throw` и глобального состояния. Парсеры возвращают `{ ok: true, value } | { ok: false, error }`.
- **Три языка.** Сообщения об ошибках и форматирование на русском, казахском и английском.
- **Всё рядом.** Схемы zod, генератор тестовых данных с seed и CLI.

> Статус: до первого релиза. В npm пакет пока не опубликован, до 1.0 API может меняться.

## Установка

```sh
npm i shanyraq
```

Node ≥ 18 или любой современный бандлер; есть сборки ESM и CommonJS.

## Примеры

```ts
import { parseIIN } from 'shanyraq/iin'
import { parsePhone, formatPhone } from 'shanyraq/phone'
import { parseIBAN } from 'shanyraq/iban'
import { moneyToWords } from 'shanyraq/money'
import { countWorkingDays, isDayOff } from 'shanyraq/calendar'
import { formatDate } from 'shanyraq/date'
import { toLatin } from 'shanyraq/translit'

parseIIN('900101 300126')
// { ok: true, value: { value: '900101300126', birthDate: '1990-01-01', gender: 'male', century: 20 } }

const r = parsePhone('8 (707) 123-45-67')
// { ok: true, value: { e164: '+77071234567', country: 'KZ', type: 'mobile', originalOperator: 'tele2-altel', ... } }
if (r.ok) formatPhone(r.value) // '+7 707 123 45 67'

parseIBAN('KZ86 125K ZT50 0410 0100') // банк определяется по коду: NBRKKZKX

moneyToWords(1234.5) // 'Одна тысяча двести тридцать четыре теңге 50 тиынов'
moneyToWords(1234.5, { lang: 'kk' }) // 'Бір мың екі жүз отыз төрт теңге 50 тиын'

isDayOff('2026-03-24') // true — Наурыз выпал на выходные, день перенесён
countWorkingDays('2026-03-01', '2026-03-31') // { ok: true, value: 18 }

formatDate('2026-10-22') // '22 октября 2026 года'
formatDate('2026-10-22', { lang: 'kk' }) // '2026 жылғы 22 қазан'

toLatin('Қазақстан Республикасы') // 'Qazaqstan Respublikasy'
```

`moneyToWords` и `formatDate` возвращают `Result`; выше для краткости показано только `value`. Больше примеров (госномера, регионы, zod, faker, CLI) — в [README на английском](README.md#usage).

## Модули

| Подмодуль | Что делает |
| --- | --- |
| `shanyraq/iin` | ИИН: контрольная цифра, дата рождения, пол |
| `shanyraq/bin` | БИН: тип организации и подразделения, месяц регистрации |
| `shanyraq/taxid` | ИИН или БИН |
| `shanyraq/phone` | Номера +7: страна, мобильный оператор, город, форматирование |
| `shanyraq/iban` | IBAN Казахстана, справочник банков по коду и БИК |
| `shanyraq/money` | Сумма прописью (ru, kk), разбор суммы |
| `shanyraq/calendar` | Праздники, выходные, расчёт рабочих дней |
| `shanyraq/date` | Официальные форматы дат (ru, kk), разбор |
| `shanyraq/translit` | Кириллица → латиница (алфавиты 2021 и 2018) |
| `shanyraq/plate` | Госномера (стандарт 2012+) |
| `shanyraq/regions` | Регионы с кодами КАТО и номеров |
| `shanyraq/i18n` | Сообщения об ошибках на ru, kk, en |
| `shanyraq/zod` | Схемы zod |
| `shanyraq/faker` | Валидные тестовые данные с seed |

## Разработка

```sh
npm ci
npm test
npm run coverage    # покрытие ≥ 95%
npm run lint
npm run build && npm run size
```

Сайт с инструментами — в `playground/` (`cd playground && npm i && npm run dev`).

Нашли устаревшие данные: новый банк, перенос выходного, код оператора? Откройте issue со ссылкой на официальный источник.

## Лицензия

MIT
