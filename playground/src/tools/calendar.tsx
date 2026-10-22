import { useEffect, useState } from 'react'
import { addWorkingDays, countWorkingDays, type DayOff, getDaysOff } from 'shanyraq/calendar'
import { formatDate } from 'shanyraq/date'
import { kk, ru } from 'shanyraq/i18n'
import { Choice, Field, Status, type ToolProps } from '../ui'

// Kurban ait is known for 2020–2027, Labour Ministry transfers for 2024–2027 (data/calendar.json).
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027] as const
const COMPLETE_FROM = 2024
const DEFAULT_YEAR = 2026

const T = {
  ru: {
    year: 'Год',
    daysOff: 'Нерабочие дни помимо обычных выходных',
    incomplete:
      'Переносы по приказам Минтруда за этот год в данных не внесены — список может быть неполным.',
    shift: (name: string) => `выходной за «${name}», выпавший на выходной`,
    transfer: (from: string) => `перенос дня отдыха с ${from}`,
    count: 'Рабочие дни между датами',
    from: 'С (включительно)',
    to: 'По (включительно)',
    working: (n: number) => `Рабочих дней: ${n}`,
    add: 'Срок в рабочих днях',
    start: 'От даты',
    days: 'Рабочих дней',
    result: (d: string) => `Срок истекает: ${d}`,
    messages: ru.calendar,
  },
  kk: {
    year: 'Жыл',
    daysOff: 'Әдеттегі демалыстан басқа жұмыс істемейтін күндер',
    incomplete:
      'Бұл жылғы Еңбек министрлігі бұйрықтарымен ауыстырулар деректерге енгізілмеген — тізім толық болмауы мүмкін.',
    shift: (name: string) => `демалысқа сәйкес келген «${name}» үшін демалыс`,
    transfer: (from: string) => `демалыс күні ${from} күнінен ауыстырылды`,
    count: 'Күндер арасындағы жұмыс күндері',
    from: 'Бастап (қоса алғанда)',
    to: 'Дейін (қоса алғанда)',
    working: (n: number) => `Жұмыс күндері: ${n}`,
    add: 'Жұмыс күндеріндегі мерзім',
    start: 'Күннен бастап',
    days: 'Жұмыс күндері',
    result: (d: string) => `Мерзім аяқталады: ${d}`,
    messages: kk.calendar,
  },
}

export default function Calendar({ lang }: ToolProps) {
  const t = T[lang]
  const long = (d: string): string => {
    const r = formatDate(d, { lang })
    return r.ok ? r.value : d
  }
  const describe = (d: DayOff): string =>
    d.kind === 'holiday'
      ? (d.holiday?.name[lang] ?? '')
      : d.kind === 'shift'
        ? t.shift(d.holiday?.name[lang] ?? '')
        : t.transfer(long(d.from ?? ''))

  const [year, setYear] = useState<number>(DEFAULT_YEAR)
  const [from, setFrom] = useState(`${DEFAULT_YEAR}-01-01`)
  const [to, setTo] = useState(`${DEFAULT_YEAR}-12-31`)
  const [start, setStart] = useState(`${DEFAULT_YEAR}-12-15`)
  const [days, setDays] = useState('10')

  // Server markup is built for DEFAULT_YEAR; move to the visitor's year after hydration.
  useEffect(() => {
    const now = new Date().getFullYear()
    if (now !== DEFAULT_YEAR && YEARS.includes(now as (typeof YEARS)[number])) {
      setYear(now)
      setFrom(`${now}-01-01`)
      setTo(`${now}-12-31`)
    }
  }, [])

  const off = getDaysOff(year)
  const count = countWorkingDays(from, to)
  const n = Number(days)
  const until = days.trim() && Number.isInteger(n) ? addWorkingDays(start, n) : undefined

  return (
    <>
      <div className="bar">
        <Choice
          label={t.year}
          value={String(year)}
          options={YEARS.map((y) => [String(y), String(y)] as const)}
          onChange={(v) => setYear(Number(v))}
        />
      </div>
      <h3>{t.daysOff}</h3>
      {year < COMPLETE_FROM && <Status>{t.incomplete}</Status>}
      {off.ok ? (
        <ul className="days">
          {off.value.map((d) => (
            <li key={d.date + d.kind} className={d.kind}>
              <time dateTime={d.date}>{long(d.date)}</time>
              <span>{describe(d)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Status ok={false}>{t.messages[off.error]}</Status>
      )}

      <h3>{t.count}</h3>
      <div className="grid">
        <Field label={t.from} type="date" value={from} onChange={setFrom} />
        <Field label={t.to} type="date" value={to} onChange={setTo} />
      </div>
      {count.ok ? (
        <Status ok>{t.working(count.value)}</Status>
      ) : (
        <Status ok={false}>{t.messages[count.error]}</Status>
      )}

      <h3>{t.add}</h3>
      <div className="grid">
        <Field label={t.start} type="date" value={start} onChange={setStart} />
        <Field label={t.days} type="number" inputMode="numeric" value={days} onChange={setDays} />
      </div>
      {until &&
        (until.ok ? (
          <Status ok>{t.result(long(until.value))}</Status>
        ) : (
          <Status ok={false}>{t.messages[until.error]}</Status>
        ))}
    </>
  )
}
