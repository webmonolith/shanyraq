import { kk, ru } from 'shanyraq/i18n'
import { type DismissalReason, dismissalPay } from 'shanyraq/leave'
import { Choice, Field, fmt, Rows, Share, Status, type ToolProps, useQuery } from '../ui'

const dmy = (iso: string) => iso.split('-').reverse().join('.')

const REASONS = ['reduction', 'liquidation', 'breach', 'decline', 'other'] as const

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    reason: 'Основание увольнения',
    reasons: [
      ['reduction', 'сокращение штата (1 месяц)'],
      ['liquidation', 'ликвидация работодателя (1 месяц)'],
      ['breach', 'работодатель нарушил договор (1 месяц)'],
      ['decline', 'снижение объёма производства (2 месяца)'],
      ['other', 'по собственному желанию, соглашению сторон, другое'],
    ] as const,
    basis: 'Заработок указан',
    bases: [
      ['year', 'за 12 месяцев'],
      ['month', 'в месяц (одинаковый весь год)'],
    ] as const,
    earnings: 'Начислено, ₸',
    end: 'Последний рабочий день',
    unused: 'Неиспользованных дней отпуска',
    salary: 'Оклад в месяц, ₸',
    salaryHint: 'пусто — не считать зарплату',
    worked: 'Отработано рабочих дней за 12 месяцев',
    workedHint: 'пусто — весь год по календарю',
    total: 'Итого к выплате',
    payBy: 'Выплатить не позднее',
    daily: 'Среднедневной заработок',
    period: 'Расчётный период',
    periodDays: 'Рабочих дней в периоде',
    salaryRow: (w: number, all: number) => `Зарплата за ${w} из ${all} рабочих дней`,
    compRow: (d: number, w: number) => `Компенсация за ${d} дн. отпуска (${w} рабочих)`,
    compSpan: 'Период компенсации',
    holidays: 'Праздники в нём (продлевают его)',
    sevRow: (m: number, w: number) => `Выплата при потере работы, ${m} мес. (${w} рабочих дней)`,
    sevSpan: 'Месяц(ы) средней зарплаты',
    none: 'нет',
    hint: 'Введите сумму, например 3 600 000 за год или 300 000 в месяц.',
    note: 'Суммы до удержания ИПН и взносов. Договор или акт работодателя может давать больше (ст. 131 п. 3).',
    messages: ru.leave,
  },
  kk: {
    reason: 'Жұмыстан шығару негізі',
    reasons: [
      ['reduction', 'штатты қысқарту (1 ай)'],
      ['liquidation', 'жұмыс берушінің таратылуы (1 ай)'],
      ['breach', 'жұмыс беруші шартты бұзды (1 ай)'],
      ['decline', 'өндіріс көлемінің төмендеуі (2 ай)'],
      ['other', 'өз қалауы, тараптардың келісімі, басқа'],
    ] as const,
    basis: 'Табыс көрсетілген',
    bases: [
      ['year', '12 айдағы'],
      ['month', 'айына (жыл бойы бірдей)'],
    ] as const,
    earnings: 'Есептелген, ₸',
    end: 'Соңғы жұмыс күні',
    unused: 'Пайдаланылмаған демалыс күндері',
    salary: 'Айлық жалақы, ₸',
    salaryHint: 'бос — жалақыны есептемеу',
    worked: '12 айда жұмыс істеген күндер',
    workedHint: 'бос — күнтізбе бойынша бүкіл жыл',
    total: 'Барлығы төленеді',
    payBy: 'Төлеудің соңғы күні',
    daily: 'Орташа күндік табыс',
    period: 'Есеп кезеңі',
    periodDays: 'Кезеңдегі жұмыс күндері',
    salaryRow: (w: number, all: number) => `${all} жұмыс күнінің ${w} күніне жалақы`,
    compRow: (d: number, w: number) => `${d} күн демалыс үшін өтемақы (${w} жұмыс күні)`,
    compSpan: 'Өтемақы кезеңі',
    holidays: 'Ондағы мерекелер (оны ұзартады)',
    sevRow: (m: number, w: number) => `Жұмыстан айырылу төлемі, ${m} ай (${w} жұмыс күні)`,
    sevSpan: 'Орташа жалақы айы',
    none: 'жоқ',
    hint: 'Соманы енгізіңіз, мысалы жылына 3 600 000 немесе айына 300 000.',
    note: 'ЖТС мен жарналар ұсталғанға дейінгі сомалар. Шарт немесе жұмыс берушінің актісі көбірек бере алады (131-бап 3-т.).',
    messages: kk.leave,
  },
}

const num = (s: string) => Number(s.replace(/[\s ]/g, '').replace(',', '.'))

export default function Dismissal({ lang }: ToolProps) {
  const t = T[lang]
  const [reasonQ, setReason] = useQuery('reason', 'reduction')
  const [basisQ, setBasis] = useQuery('basis', 'year')
  const reason = (REASONS as readonly string[]).includes(reasonQ)
    ? (reasonQ as DismissalReason)
    : 'reduction'
  const basis = basisQ === 'month' ? 'month' : 'year'
  const [value, setValue] = useQuery('q', '3600000')
  const [end, setEnd] = useQuery('end', '2026-06-30')
  const [unused, setUnused] = useQuery('days', '12')
  const [salary, setSalary] = useQuery('salary', '')
  const [worked, setWorked] = useQuery('worked', '')
  const earnings = basis === 'month' && value.trim() ? String(num(value) * 12) : value
  const r = !value.trim()
    ? undefined
    : dismissalPay(earnings, end, {
        reason,
        unusedDays: unused.trim() ? num(unused) : 0,
        ...(salary.trim() ? { salary } : {}),
        ...(worked.trim() ? { workedDays: num(worked) } : {}),
      })
  const v = r?.ok ? r.value : undefined
  const error = r && !r.ok ? r.error : undefined
  return (
    <>
      <div className="grid">
        <Choice label={t.reason} value={reason} options={t.reasons} onChange={setReason} />
        <Choice label={t.basis} value={basis} options={t.bases} onChange={setBasis} />
        <Field label={t.earnings} value={value} onChange={setValue} inputMode="decimal" />
        <Field label={t.end} value={end} onChange={setEnd} type="date" />
        <Field label={t.unused} value={unused} onChange={setUnused} inputMode="numeric" />
        <Field
          label={t.salary}
          value={salary}
          onChange={setSalary}
          placeholder={t.salaryHint}
          inputMode="decimal"
        />
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
      ) : error || !v ? (
        <Status ok={false}>{t.messages[error ?? 'invalid']}</Status>
      ) : (
        <>
          <div className="result">
            <div>
              <small>{t.total}</small>
              <b>{fmt(v.pay, 2)} ₸</b>
            </div>
            <div>
              <small>{t.payBy}</small>
              <b>{dmy(v.payBy)}</b>
            </div>
            <div>
              <small>{t.daily}</small>
              <b>{fmt(v.dailyWage, 2)} ₸</b>
            </div>
          </div>
          <Rows
            lang={lang}
            rows={[
              ...(v.salary
                ? ([
                    [
                      t.salaryRow(v.salary.workingDays, v.salary.monthWorkingDays),
                      `${fmt(v.salary.pay, 2)} ₸`,
                    ],
                  ] as [string, string][])
                : []),
              ...(v.compensation
                ? ([
                    [
                      t.compRow(v.compensation.days, v.compensation.workingDays),
                      `${fmt(v.compensation.pay, 2)} ₸`,
                    ],
                    [t.compSpan, `${dmy(v.compensation.start)} — ${dmy(v.compensation.end)}`],
                    [t.holidays, v.compensation.holidays.map(dmy).join(', ') || t.none],
                  ] as [string, string][])
                : []),
              ...(v.severance
                ? ([
                    [
                      t.sevRow(v.severance.months, v.severance.workingDays),
                      `${fmt(v.severance.pay, 2)} ₸`,
                    ],
                    [t.sevSpan, `${dmy(v.severance.from)} — ${dmy(v.severance.to)}`],
                  ] as [string, string][])
                : []),
              [t.period, `${dmy(v.period.from)} — ${dmy(v.period.to)}`],
              [t.periodDays, String(v.period.workingDays)],
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
