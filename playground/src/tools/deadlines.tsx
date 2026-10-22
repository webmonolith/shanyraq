import { useEffect, useState } from 'react'
import {
  type DeadlineTag,
  type TaxDeadline,
  type TaxRegime,
  taxDeadlines,
} from 'shanyraq/deadlines'
import { kk, ru } from 'shanyraq/i18n'
import { deadlines, regimes, tags } from '../../../data/deadlines.json'
import { Check, Choice, Share, Status, type ToolProps, useQuery } from '../ui'

const YEARS = ['2026', '2027'] as const
const REGIMES = Object.keys(regimes) as TaxRegime[]
const BY_ID = Object.fromEntries(deadlines.map((d) => [d.id, d]))
const tagsOf = (regime: TaxRegime): DeadlineTag[] => [
  ...new Set(
    deadlines.flatMap(
      (d) => ((d.regimes as Partial<Record<TaxRegime, string[]>>)[regime] ?? []) as DeadlineTag[],
    ),
  ),
]

const dm = (iso: string) => `${iso.slice(8)}.${iso.slice(5, 7)}`
const dmy = (iso: string) => iso.split('-').reverse().join('.')

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    year: 'Год',
    regime: 'Режим',
    conditions: 'Что из этого про вас',
    months: [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ],
    days: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
    report: 'сдать',
    pay: 'оплатить',
    form: 'форма',
    period: 'за',
    moved: (d: string) => `перенесено с ${d}`,
    past: 'Прошедшие сроки скрыты',
    showPast: 'Показать прошедшие',
    count: (n: number) => `Сроков: ${n}`,
    none: 'Для выбранных условий сроков нет.',
    ics: 'Добавить в календарь (.ics)',
    messages: ru.deadlines,
  },
  kk: {
    year: 'Жыл',
    regime: 'Режим',
    conditions: 'Сізге қатыстысы',
    months: [
      'Қаңтар',
      'Ақпан',
      'Наурыз',
      'Сәуір',
      'Мамыр',
      'Маусым',
      'Шілде',
      'Тамыз',
      'Қыркүйек',
      'Қазан',
      'Қараша',
      'Желтоқсан',
    ],
    days: ['жс', 'дс', 'сс', 'ср', 'бс', 'жм', 'сб'],
    report: 'тапсыру',
    pay: 'төлеу',
    form: 'нысан',
    period: 'кезең',
    moved: (d: string) => `${d} күнінен ауыстырылды`,
    past: 'Өткен мерзімдер жасырылған',
    showPast: 'Өткендерін көрсету',
    count: (n: number) => `Мерзімдер: ${n}`,
    none: 'Таңдалған шарттар үшін мерзімдер жоқ.',
    ics: 'Күнтізбеге қосу (.ics)',
    messages: kk.deadlines,
  },
}

type Texts = (typeof T)['ru'] | (typeof T)['kk']

const name = (d: TaxDeadline, lang: 'ru' | 'kk') => {
  const row = BY_ID[d.id] as (typeof deadlines)[number]
  return lang === 'ru' ? row.name : row.nameKk
}

const periodText = (p: TaxDeadline['period']) => `${dmy(p.from)} — ${dmy(p.to)}`

const ics = (list: TaxDeadline[], lang: 'ru' | 'kk', t: Texts) => {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1')
  const events = list.map((d) => {
    const day = d.date.replace(/-/g, '')
    const title = `${d.kind === 'report' ? t.report : t.pay}: ${name(d, lang)}${d.form ? ` (${d.form})` : ''}`
    return [
      'BEGIN:VEVENT',
      `UID:${d.id}-${d.date}@shanyraq.webmonolith.kz`,
      `DTSTAMP:${stamp}Z`,
      `DTSTART;VALUE=DATE:${day}`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc(`${t.period} ${periodText(d.period)}`)}`,
      'END:VEVENT',
    ].join('\r\n')
  })
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//shanyraq//tax deadlines//RU',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }))
  a.download = 'shanyraq-tax-deadlines.ics'
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function Deadlines({ lang }: ToolProps) {
  const t = T[lang]
  const [yearQ, setYear] = useQuery('year', '2026')
  const [regimeQ, setRegime] = useQuery('regime', 'simplified')
  const [tagsQ, setTags] = useQuery('tags', '')
  const [today, setToday] = useState('')
  const [showPast, setShowPast] = useState(false)
  useEffect(() => {
    const d = new Date()
    setToday(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    )
  }, [])

  const year = YEARS.find((y) => y === yearQ) ?? '2026'
  const regime = REGIMES.find((r) => r === regimeQ) ?? 'simplified'
  const available = tagsOf(regime)
  const chosen = tagsQ
    .split(',')
    .filter((x): x is DeadlineTag => available.includes(x as DeadlineTag))
  const toggle = (tag: DeadlineTag, on: boolean) =>
    setTags((on ? [...chosen, tag] : chosen.filter((x) => x !== tag)).join(','))

  const r = taxDeadlines(Number(year), { regime, tags: chosen, calendar: { strict: true } })
  const all = r.ok ? r.value : []
  const hidePast = Boolean(today) && !showPast && today.slice(0, 4) === year
  const list = hidePast ? all.filter((d) => d.date >= today) : all
  const months = new Map<number, TaxDeadline[]>()
  for (const d of list) {
    const m = Number(d.date.slice(5, 7))
    months.set(m, [...(months.get(m) ?? []), d])
  }

  return (
    <>
      <div className="grid">
        <Choice
          label={t.year}
          value={year}
          options={YEARS.map((y) => [y, y] as const)}
          onChange={setYear}
        />
        <Choice
          label={t.regime}
          value={regime}
          options={REGIMES.map((x) => [x, regimes[x][lang]] as const)}
          onChange={(v) => {
            setRegime(v)
            setTags('')
          }}
        />
      </div>
      {available.length > 0 && (
        <fieldset className="checks">
          <legend>{t.conditions}</legend>
          {available.map((tag) => (
            <Check
              key={tag}
              label={tags[tag][lang]}
              checked={chosen.includes(tag)}
              onChange={(on) => toggle(tag, on)}
            />
          ))}
        </fieldset>
      )}
      {!r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          <div className="bar">
            <span className="note">{t.count(list.length)}</span>
            {hidePast && all.length > list.length && (
              <button type="button" className="ghost" onClick={() => setShowPast(true)}>
                {t.showPast}
              </button>
            )}
          </div>
          {list.length === 0 && <Status>{t.none}</Status>}
          {[...months].map(([m, items]) => (
            <section key={m} className="deadlines">
              <h3>
                {t.months[m - 1]} {year}
              </h3>
              <ul>
                {items.map((d) => (
                  <li key={`${d.id}-${d.date}`} className={d.kind}>
                    <time dateTime={d.date}>
                      <b>{dm(d.date)}</b>
                      <small>{t.days[new Date(`${d.date}T00:00:00Z`).getUTCDay()]}</small>
                    </time>
                    <div>
                      <span className={`tag ${d.kind}`}>
                        {d.kind === 'report' ? t.report : t.pay}
                      </span>{' '}
                      {name(d, lang)}
                      {d.form && (
                        <small>
                          {' '}
                          · {t.form} {d.form}
                        </small>
                      )}
                      <br />
                      <small>
                        {t.period} {periodText(d.period)}
                        {d.moved && ` · ${t.moved(dm(d.due))}`}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <div className="bar">
            <Share lang={lang} />
            {list.length > 0 && (
              <button type="button" className="ghost" onClick={() => ics(list, lang, t)}>
                {t.ics}
              </button>
            )}
          </div>
        </>
      )}
    </>
  )
}
