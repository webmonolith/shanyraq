import { useMemo, useState } from 'react'
import { createFaker } from 'shanyraq/faker'
import { kk, ru } from 'shanyraq/i18n'
import { formatIBAN, parseIBAN } from 'shanyraq/iban'
import { formatPhone, parsePhone } from 'shanyraq/phone'
import { parsePlate } from 'shanyraq/plate'
import { getRegion } from 'shanyraq/regions'
import { parseTaxId } from 'shanyraq/taxid'
import { track } from '../analytics'
import { Check, Choice, Field, Status, type ToolProps } from '../ui'

type Kind = 'taxid' | 'phone' | 'iban' | 'plate'

const fake = createFaker(2026)
const EXAMPLES: Record<Kind, string> = {
  taxid: [fake.iin(), fake.bin(), fake.iin({ gender: 'female' }), '123456789012'].join('\n'),
  phone: [fake.phone(), '+7 7172 55 12 34', '+7 495 123 45 67', '8 700 12'].join('\n'),
  iban: [fake.iban(), fake.iban({ bankCode: '722' }), 'KZ00 722C 0000 0000 0000'].join('\n'),
  plate: [fake.plate(), '237 BLM 01', 'D123 456', 'ABC 99'].join('\n'),
}

const MAX = 10_000
const SHOWN = 200

const OPERATORS = { kcell: 'Kcell', beeline: 'Beeline', 'tele2-altel': 'Tele2/Altel' } as const

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    kind: 'Что проверяем',
    kinds: [
      ['taxid', 'ИИН / БИН'],
      ['phone', 'Телефон'],
      ['iban', 'IBAN'],
      ['plate', 'Госномер'],
    ] as const,
    column: 'Столбец CSV',
    input: 'Значения, по одному в строке',
    file: 'Загрузить CSV или TXT',
    strict: 'Строгая проверка',
    onlyBad: 'Только с ошибками',
    hint: 'Вставьте столбец из таблицы или загрузите файл. Первая строка без цифр считается заголовком и пропускается.',
    summary: (ok: number, all: number) => `Корректных: ${ok} из ${all}`,
    cut: (n: number) => `Проверены первые ${MAX} строк из ${n}.`,
    shown: `Показаны первые ${SHOWN} строк; в CSV — все.`,
    download: 'Скачать CSV',
    head: ['№', 'Ввод', 'Результат', 'Значение', 'Подробности'],
    yes: 'да',
    no: 'нет',
    iin: 'ИИН',
    bin: 'БИН',
    genders: { male: 'мужской', female: 'женский' },
    entities: {
      resident: 'юрлицо-резидент',
      nonResident: 'юрлицо-нерезидент',
      jointEntrepreneur: 'ИП (совместное предпринимательство)',
      reserved: 'зарезервированный код',
    },
    divisions: {
      head: 'головное',
      branch: 'филиал',
      representative: 'представительство',
      farm: 'КХ',
    },
    countries: { KZ: 'Казахстан', RU: 'Россия', ambiguous: 'KZ или RU' },
    unknownBank: 'банк не найден',
    noRegion: 'без кода региона',
    messages: ru,
  },
  kk: {
    kind: 'Не тексереміз',
    kinds: [
      ['taxid', 'ЖСН / БСН'],
      ['phone', 'Телефон'],
      ['iban', 'IBAN'],
      ['plate', 'Мемл. нөмір'],
    ] as const,
    column: 'CSV бағаны',
    input: 'Мәндер, әр жолда біреуден',
    file: 'CSV немесе TXT жүктеу',
    strict: 'Қатаң тексеру',
    onlyBad: 'Тек қателері барлар',
    hint: 'Кестеден бағанды қойыңыз немесе файл жүктеңіз. Цифры жоқ бірінші жол тақырып деп есептеліп, өткізіледі.',
    summary: (ok: number, all: number) => `Дұрысы: ${all} ішінен ${ok}`,
    cut: (n: number) => `${n} жолдың алғашқы ${MAX} жолы тексерілді.`,
    shown: `Алғашқы ${SHOWN} жол көрсетілген; CSV-де — барлығы.`,
    download: 'CSV жүктеп алу',
    head: ['№', 'Енгізілгені', 'Нәтиже', 'Мәні', 'Толығырақ'],
    yes: 'иә',
    no: 'жоқ',
    iin: 'ЖСН',
    bin: 'БСН',
    genders: { male: 'ер', female: 'әйел' },
    entities: {
      resident: 'резидент заңды тұлға',
      nonResident: 'бейрезидент заңды тұлға',
      jointEntrepreneur: 'ЖК (бірлескен кәсіпкерлік)',
      reserved: 'резервтегі код',
    },
    divisions: {
      head: 'бас бөлімше',
      branch: 'филиал',
      representative: 'өкілдік',
      farm: 'ШҚ',
    },
    countries: { KZ: 'Қазақстан', RU: 'Ресей', ambiguous: 'KZ немесе RU' },
    unknownBank: 'банк табылмады',
    noRegion: 'өңір кодынсыз',
    messages: kk,
  },
}

type Texts = (typeof T)['ru' | 'kk']

interface Checked {
  input: string
  ok: boolean
  value: string
  details: string
}

const fail = (input: string, error: string): Checked => ({
  input,
  ok: false,
  value: '',
  details: error,
})

const CHECK: Record<
  Kind,
  (input: string, strict: boolean, t: Texts, lang: 'ru' | 'kk') => Checked
> = {
  taxid: (input, strict, t) => {
    const r = parseTaxId(input, { strict })
    if (!r.ok) return fail(input, t.messages.taxid[r.error])
    const v = r.value
    const details =
      v.kind === 'iin'
        ? [t.iin, v.birthDate, v.gender && t.genders[v.gender]]
        : [t.bin, t.entities[v.entityType], v.divisionType && t.divisions[v.divisionType]]
    return { input, ok: true, value: v.value, details: details.filter(Boolean).join(' · ') }
  },
  phone: (input, strict, t, lang) => {
    const r = parsePhone(input, { strict })
    if (!r.ok) return fail(input, t.messages.phone[r.error])
    const v = r.value
    const details = [
      t.countries[v.country],
      v.originalOperator && OPERATORS[v.originalOperator],
      v.city?.[lang],
    ]
    return {
      input,
      ok: true,
      value: formatPhone(v),
      details: details.filter(Boolean).join(' · '),
    }
  },
  iban: (input, strict, t, lang) => {
    const r = parseIBAN(input, { strict })
    if (!r.ok) return fail(input, t.messages.iban[r.error])
    const bank = r.value.bank
    return {
      input,
      ok: true,
      value: formatIBAN(r.value),
      details: bank ? `${bank.name[lang]} · ${bank.bic}` : t.unknownBank,
    }
  },
  plate: (input, strict, t, lang) => {
    const r = parsePlate(input, { strict })
    if (!r.ok) return fail(input, t.messages.plate[r.error])
    const region = r.value.regionId ? getRegion(r.value.regionId) : undefined
    return {
      input,
      ok: true,
      value: r.value.value,
      details: region ? `${region.name[lang]} (${r.value.regionCode})` : t.noRegion,
    }
  },
}

// Quoted cells keep their separators: "Иванов, Иван" or "ТОО ""Альфа; Бета""".
const split = (line: string, sep: string): string[] => {
  const out: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"' && !cell.trim()) quoted = true
    else if (c === sep) {
      out.push(cell.trim())
      cell = ''
    } else cell += c
  }
  out.push(cell.trim())
  return out
}

/** Non-empty cells of one column; a first line without digits is a header. */
const readColumn = (text: string, column: number): string[] => {
  const lines = text.split(/\r?\n/)
  const first = lines.find((l) => l.trim()) ?? ''
  // one separator per file: the one that splits the first line into the most cells
  const sep = [';', '\t', ','].reduce((a, b) =>
    split(first, b).length > split(first, a).length ? b : a,
  )
  const cells = lines.map((line) => split(line, sep)[column - 1] ?? '').filter(Boolean)
  return cells[0] && !/\d/.test(cells[0]) ? cells.slice(1) : cells
}

const csvCell = (s: string) => (/[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

const download = (rows: Checked[], t: Texts) => {
  track('export_csv')
  const lines = [
    t.head.slice(1),
    ...rows.map((r) => [r.input, r.ok ? t.yes : t.no, r.value, r.details]),
  ].map((cells) => cells.map(csvCell).join(';'))
  // BOM so Excel opens Cyrillic as UTF-8
  const blob = new Blob([`\ufeff${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'shanyraq.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function Batch({ lang }: ToolProps) {
  const t = T[lang]
  const [kind, setKind] = useState<Kind>('taxid')
  const [text, setText] = useState(EXAMPLES.taxid)
  const [column, setColumn] = useState('1')
  const [strict, setStrict] = useState(false)
  const [onlyBad, setOnlyBad] = useState(false)
  const col = Math.max(1, Math.trunc(Number(column)) || 1)
  const values = useMemo(() => readColumn(text, col), [text, col])
  const rows = useMemo(
    () => values.slice(0, MAX).map((v) => CHECK[kind](v, strict, t, lang)),
    [values, kind, strict, t, lang],
  )
  const valid = rows.filter((r) => r.ok).length
  const visible = rows.map((r, i) => [i + 1, r] as const).filter(([, r]) => !onlyBad || !r.ok)

  const pickKind = (k: Kind) => {
    if (text === EXAMPLES[kind]) setText(EXAMPLES[k])
    setKind(k)
  }

  return (
    <>
      <div className="grid">
        <Choice label={t.kind} value={kind} options={t.kinds} onChange={pickKind} />
        <Field
          label={t.column}
          value={column}
          onChange={setColumn}
          type="number"
          inputMode="numeric"
        />
      </div>
      <label className="field wide batch__input">
        <span>{t.input}</span>
        <textarea
          rows={6}
          value={text}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <div className="bar">
        <label className="ghost file">
          {t.file}
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={(e) => {
              e.target.files?.[0]?.text().then(setText)
              e.target.value = ''
            }}
          />
        </label>
        <Check label={t.strict} checked={strict} onChange={setStrict} />
        <Check label={t.onlyBad} checked={onlyBad} onChange={setOnlyBad} />
        {rows.length > 0 && (
          <button type="button" className="ghost" onClick={() => download(rows, t)}>
            {t.download}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <Status>{t.hint}</Status>
      ) : (
        <>
          <Status ok={valid === rows.length}>
            {t.summary(valid, rows.length)}
            {values.length > MAX && ` ${t.cut(values.length)}`}
          </Status>
          <div className="table">
            <table>
              <thead>
                <tr>
                  {t.head.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, SHOWN).map(([n, r]) => (
                  <tr key={n} className={r.ok ? undefined : 'bad'}>
                    <td>{n}</td>
                    <td>
                      <code>{r.input}</code>
                    </td>
                    <td>{r.ok ? '✓' : '✕'}</td>
                    <td>
                      <code>{r.value}</code>
                    </td>
                    <td className="wrap">{r.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible.length > SHOWN && <Status>{t.shown}</Status>}
        </>
      )}
    </>
  )
}
