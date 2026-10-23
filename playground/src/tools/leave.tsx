import { kk, ru } from 'shanyraq/i18n'
import { sickPay, vacationPay } from 'shanyraq/leave'
import { getTaxYear } from 'shanyraq/tax'
import { Choice, Field, fmt, Rows, Share, Status, type ToolProps, useQuery } from '../ui'

const YEAR = getTaxYear() as { year: number; mrp: number }

const dmy = (iso: string) => iso.split('-').reverse().join('.')

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    basis: 'Заработок указан',
    bases: [
      ['year', 'за 12 месяцев'],
      ['month', 'в месяц (одинаковый весь год)'],
    ] as const,
    earnings: 'Начислено, ₸',
    start: 'Первый день отпуска',
    days: 'Календарных дней',
    from: 'Первый день болезни',
    to: 'Последний день болезни',
    worked: 'Отработано рабочих дней',
    workedHint: 'пусто — весь год по календарю',
    daily: 'Среднедневной заработок',
    paid: 'Оплачиваемых рабочих дней',
    pay: 'Начислено',
    period: 'Расчётный период',
    periodDays: 'Рабочих дней в периоде',
    leave: 'Отпуск',
    holidays: 'Праздники в отпуске (продлевают его)',
    none: 'нет',
    month: (m: string) => `${m.slice(5)}.${m.slice(0, 4)}: рабочих дней`,
    cap: `Пособие урезано лимитом 25 МРП (${fmt(25 * YEAR.mrp)} ₸) в месяц.`,
    hint: 'Введите сумму, например 3 600 000 за год или 300 000 в месяц.',
    note: 'Сумма до удержаний. Пятидневная рабочая неделя.',
    messages: ru.leave,
  },
  kk: {
    basis: 'Табыс көрсетілген',
    bases: [
      ['year', '12 айға'],
      ['month', 'айына (жыл бойы бірдей)'],
    ] as const,
    earnings: 'Есептелген, ₸',
    start: 'Демалыстың бірінші күні',
    days: 'Күнтізбелік күн',
    from: 'Ауырудың бірінші күні',
    to: 'Ауырудың соңғы күні',
    worked: 'Жұмыс істеген күндер',
    workedHint: 'бос — күнтізбе бойынша бүкіл жыл',
    daily: 'Орташа күндік табыс',
    paid: 'Ақы төленетін жұмыс күндері',
    pay: 'Есептелді',
    period: 'Есеп кезеңі',
    periodDays: 'Кезеңдегі жұмыс күндері',
    leave: 'Демалыс',
    holidays: 'Демалыстағы мерекелер (оны ұзартады)',
    none: 'жоқ',
    month: (m: string) => `${m.slice(5)}.${m.slice(0, 4)}: жұмыс күндері`,
    cap: `Жәрдемақы айына 25 АЕК (${fmt(25 * YEAR.mrp)} ₸) шегімен шектелді.`,
    hint: 'Соманы енгізіңіз, мысалы жылына 3 600 000 немесе айына 300 000.',
    note: 'Ұсталымдарға дейінгі сома. Бес күндік жұмыс аптасы.',
    messages: kk.leave,
  },
}

const num = (s: string) => Number(s.replace(/[\s ]/g, '').replace(',', '.'))

export function LeaveTool({ lang, kind }: ToolProps & { kind: 'vacation' | 'sick' }) {
  const t = T[lang]
  const [basisQ, setBasis] = useQuery('basis', 'year')
  const basis = basisQ === 'month' ? 'month' : 'year'
  const [value, setValue] = useQuery('q', '3600000')
  const [start, setStart] = useQuery('start', '2026-07-01')
  const [days, setDays] = useQuery('days', '24')
  const [from, setFrom] = useQuery('from', '2026-03-02')
  const [to, setTo] = useQuery('to', '2026-03-06')
  const [worked, setWorked] = useQuery('worked', '')
  const earnings = basis === 'month' && value.trim() ? String(num(value) * 12) : value
  const options = worked.trim() ? { workedDays: num(worked) } : {}
  const r = !value.trim()
    ? undefined
    : kind === 'vacation'
      ? vacationPay(earnings, start, num(days), options)
      : sickPay(earnings, from, to, options)
  return (
    <>
      <div className="grid">
        <Choice label={t.basis} value={basis} options={t.bases} onChange={setBasis} />
        <Field label={t.earnings} value={value} onChange={setValue} inputMode="decimal" />
        {kind === 'vacation' ? (
          <>
            <Field label={t.start} value={start} onChange={setStart} type="date" />
            <Field label={t.days} value={days} onChange={setDays} inputMode="numeric" />
          </>
        ) : (
          <>
            <Field label={t.from} value={from} onChange={setFrom} type="date" />
            <Field label={t.to} value={to} onChange={setTo} type="date" />
          </>
        )}
        <Field
          label={t.worked}
          value={worked}
          onChange={setWorked}
          placeholder={t.workedHint}
          inputMode="numeric"
        />
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          <div className="result">
            <div>
              <small>{t.pay}</small>
              <b>{fmt(r.value.pay, 2)} ₸</b>
            </div>
            <div>
              <small>{t.daily}</small>
              <b>{fmt(r.value.dailyWage, 2)} ₸</b>
            </div>
            <div>
              <small>{t.paid}</small>
              <b>{r.value.workingDays}</b>
            </div>
          </div>
          {'capped' in r.value && r.value.capped && <Status ok={false}>{t.cap}</Status>}
          <Rows
            lang={lang}
            rows={[
              [t.period, `${dmy(r.value.period.from)} — ${dmy(r.value.period.to)}`],
              [t.periodDays, String(r.value.period.workingDays)],
              ...('end' in r.value
                ? ([
                    [t.leave, `${dmy(r.value.start)} — ${dmy(r.value.end)}`],
                    [t.holidays, r.value.holidays.map(dmy).join(', ') || t.none],
                  ] as [string, string][])
                : r.value.months.map((m): [string, string] => [
                    t.month(m.month),
                    `${m.workingDays} · ${fmt(m.pay, 2)} ₸`,
                  ])),
            ]}
          />
          <p className="note">{t.note}</p>
          <div className="bar">
            <Share lang={lang} />
          </div>
        </>
      )}
    </>
  )
}

export default function Leave({ lang }: ToolProps) {
  return <LeaveTool lang={lang} kind="vacation" />
}
