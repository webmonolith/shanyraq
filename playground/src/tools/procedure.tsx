import { kk, ru } from 'shanyraq/i18n'
import { type ProcedureDeadline, type ProcedurePeriod, procedureTerm } from 'shanyraq/procedure'
import { Choice, Field, Rows, Share, Status, type ToolProps, useQuery } from '../ui'

const dmy = (iso: string) => iso.split('-').reverse().join('.')
const nextDay = (iso: string) => new Date(Date.parse(iso) + 864e5).toISOString().slice(0, 10)

type Kind = ProcedureDeadline | 'custom'
const KINDS: Kind[] = [
  'appeal',
  'privateComplaint',
  'cassation',
  'courtOrderObjection',
  'finalDecision',
  'custom',
]
const UNITS = ['days', 'workingDays', 'months', 'years'] as const

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    kind: 'Срок',
    kinds: [
      ['appeal', 'апелляционная жалоба — 1 месяц'],
      ['privateComplaint', 'частная жалоба на определение — 10 рабочих дней'],
      ['cassation', 'кассационная жалоба — 6 месяцев'],
      ['courtOrderObjection', 'возражение на судебный приказ — 10 рабочих дней'],
      ['finalDecision', 'решение в окончательной форме — 5 рабочих дней'],
      ['custom', 'свой срок'],
    ] as const,
    event: {
      appeal: 'Дата решения в окончательной форме',
      privateComplaint: 'Дата определения в окончательной форме',
      cassation: 'Дата вступления в силу постановления апелляции',
      courtOrderObjection: 'Дата получения судебного приказа',
      finalDecision: 'Дата оглашения резолютивной части',
      custom: 'Дата события',
    },
    count: 'Длительность',
    unit: 'Единица',
    units: [
      ['days', 'календарных дней'],
      ['workingDays', 'рабочих дней'],
      ['months', 'месяцев'],
      ['years', 'лет'],
    ] as const,
    end: 'Последний день срока',
    start: 'Срок начинается',
    due: 'Окончание по счёту',
    moved: (d: string) =>
      `${d} — нерабочий день, срок переносится на следующий рабочий день (ГПК, ст. 123 п. 4).`,
    force: 'Решение вступит в силу, если не обжаловано (ст. 240 п. 1)',
    note: 'Подать можно до 24:00 последнего дня — по почте или электронно; в самом суде — до конца его рабочего дня (ст. 123 п. 5–6).',
    hint: 'Выберите дату события.',
    messages: ru.calendar,
  },
  kk: {
    kind: 'Мерзім',
    kinds: [
      ['appeal', 'апелляциялық шағым — 1 ай'],
      ['privateComplaint', 'ұйғарымға жеке шағым — 10 жұмыс күні'],
      ['cassation', 'кассациялық шағым — 6 ай'],
      ['courtOrderObjection', 'сот бұйрығына қарсылық — 10 жұмыс күні'],
      ['finalDecision', 'түпкілікті нысандағы шешім — 5 жұмыс күні'],
      ['custom', 'өз мерзіміңіз'],
    ] as const,
    event: {
      appeal: 'Түпкілікті нысандағы шешім күні',
      privateComplaint: 'Түпкілікті нысандағы ұйғарым күні',
      cassation: 'Апелляция қаулысының заңды күшіне енген күні',
      courtOrderObjection: 'Сот бұйрығын алған күн',
      finalDecision: 'Қарар бөлігі жарияланған күн',
      custom: 'Оқиға күні',
    },
    count: 'Ұзақтығы',
    unit: 'Бірлік',
    units: [
      ['days', 'күнтізбелік күн'],
      ['workingDays', 'жұмыс күні'],
      ['months', 'ай'],
      ['years', 'жыл'],
    ] as const,
    end: 'Мерзімнің соңғы күні',
    start: 'Мерзім басталады',
    due: 'Есеп бойынша аяқталуы',
    moved: (d: string) =>
      `${d} — жұмыс емес күн, мерзім келесі жұмыс күніне ауысады (АПК, 123-бап 4-т.).`,
    force: 'Шағым берілмесе, шешім заңды күшіне енеді (240-бап 1-т.)',
    note: 'Соңғы күні сағат 24:00-ге дейін поштамен немесе электрондық түрде беруге болады; сотта тікелей — оның жұмыс күні аяқталғанға дейін (123-бап 5–6-т.).',
    hint: 'Оқиға күнін таңдаңыз.',
    messages: kk.calendar,
  },
}

export default function Procedure({ lang }: ToolProps) {
  const t = T[lang]
  const [kindQ, setKind] = useQuery('kind', 'appeal')
  const kind = (KINDS as string[]).includes(kindQ) ? (kindQ as Kind) : 'appeal'
  const [date, setDate] = useQuery('date', '2026-01-31')
  const [count, setCount] = useQuery('n', '15')
  const [unitQ, setUnit] = useQuery('unit', 'days')
  const unit = (UNITS as readonly string[]).includes(unitQ)
    ? (unitQ as (typeof UNITS)[number])
    : 'days'
  const period: ProcedurePeriod | ProcedureDeadline =
    kind === 'custom' ? { [unit]: Number(count.trim() || Number.NaN) } : kind
  const r = date ? procedureTerm(date, period) : undefined
  return (
    <>
      <div className="grid">
        <Choice label={t.kind} value={kind} options={t.kinds} onChange={setKind} />
        <Field label={t.event[kind]} value={date} onChange={setDate} type="date" />
        {kind === 'custom' && (
          <>
            <Field label={t.count} value={count} onChange={setCount} inputMode="numeric" />
            <Choice label={t.unit} value={unit} options={t.units} onChange={setUnit} />
          </>
        )}
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          <div className="result">
            <div>
              <small>{t.end}</small>
              <b>{dmy(r.value.end)}</b>
            </div>
          </div>
          {r.value.moved && <Status ok={false}>{t.moved(dmy(r.value.due))}</Status>}
          <Rows
            lang={lang}
            rows={[
              [t.start, dmy(r.value.start)],
              [t.due, dmy(r.value.due)],
              ...(kind === 'appeal'
                ? ([[t.force, dmy(nextDay(r.value.end))]] as [string, string][])
                : []),
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
