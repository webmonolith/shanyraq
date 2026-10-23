import { useEffect, useRef } from 'react'
import { taxPenalty } from 'shanyraq/claim'
import { kk, ru } from 'shanyraq/i18n'
import {
  Check,
  dmy,
  Field,
  fmt,
  parsePayments,
  Share,
  Status,
  type ToolProps,
  useQuery,
} from '../ui'

const pct = (n: number) => String(n).replace('.', ',')
const span = (from: string, to: string) =>
  from === to
    ? dmy(from)
    : from.slice(0, 4) === to.slice(0, 4)
      ? `${dmy(from).slice(0, 5)}–${dmy(to)}`
      : `${dmy(from)}–${dmy(to)}`

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    debt: 'Недоимка, ₸',
    due: 'Срок уплаты (с учётом переноса с выходного)',
    until: 'Дата уплаты или расчёта',
    monitoring: 'Участник горизонтального мониторинга (0,65 × ставка)',
    more: 'Частичные оплаты',
    payments: 'Каждая строка — дата и сумма: 10.09.2026 40000',
    badLine: (n: number) => `Строка ${n} частичных оплат: ожидается «ДД.ММ.ГГГГ сумма».`,
    penalty: 'Пеня',
    total: 'Недоимка с пеней',
    days: 'Дней просрочки',
    head: ['Период и сумма', 'Пеня'],
    day: 'дн.',
    stale:
      'Дата позже последнего известного решения Нацбанка по базовой ставке — ставка могла измениться, проверьте на nationalbank.kz.',
    note: 'Пеня начисляется со дня после срока уплаты по день уплаты включительно, по базовой ставке каждого дня. Так же считается пеня по соцотчислениям, ОПВ, ОПВР и ОСМС.',
    hint: 'Введите сумму и даты.',
    since:
      'Калькулятор считает просрочки с 01.01.2018 — раньше действовал Налоговый кодекс 2008 года.',
    messages: ru.claim,
  },
  kk: {
    debt: 'Бересі, ₸',
    due: 'Төлеу мерзімі (демалыстан ауыстыруды ескере)',
    until: 'Төлеу немесе есеп күні',
    monitoring: 'Көлденең мониторингке қатысушы (0,65 × мөлшерлеме)',
    more: 'Ішінара төлемдер',
    payments: 'Әр жол — күні мен сомасы: 10.09.2026 40000',
    badLine: (n: number) => `Ішінара төлемдердің ${n}-жолы: «КК.АА.ЖЖЖЖ сома» күтіледі.`,
    penalty: 'Өсімпұл',
    total: 'Бересі өсімпұлмен',
    days: 'Мерзімі өткен күндер',
    head: ['Кезең мен сома', 'Өсімпұл'],
    day: 'күн',
    stale:
      'Күн Ұлттық Банктің базалық мөлшерлеме бойынша соңғы белгілі шешімінен кейін — мөлшерлеме өзгеруі мүмкін, nationalbank.kz сайтынан тексеріңіз.',
    note: 'Өсімпұл төлеу мерзімінен кейінгі күннен бастап төлем күнін қоса, әр күнгі базалық мөлшерлемемен есептеледі. Әлеуметтік аударымдар, МЗЖ, ЖМЗЖ және МӘМС бойынша өсімпұл да осылай есептеледі.',
    hint: 'Сома мен күндерді енгізіңіз.',
    since:
      'Калькулятор 01.01.2018 бастап кешіктірулерді есептейді — бұрын 2008 жылғы Салық кодексі қолданылған.',
    messages: kk.claim,
  },
}

export default function Penalty({ lang }: ToolProps) {
  const t = T[lang]
  const [debt, setDebt] = useQuery('q', '100000')
  const [due, setDue] = useQuery('due', '2026-08-25')
  const [until, setUntil] = useQuery('to', '2026-10-01')
  const [mQ, setM] = useQuery('m', '')
  const [pay, setPay] = useQuery('pay', '')

  // Opens once the URL has been read, so shared links with payments show them.
  const more = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (pay && more.current) more.current.open = true
  }, [pay])

  const payments = parsePayments(pay)
  const r =
    debt.trim() && due && until && typeof payments !== 'number'
      ? taxPenalty(debt, due, until, { payments, monitoring: mQ === '1' })
      : undefined

  return (
    <>
      <div className="grid">
        <Field label={t.debt} value={debt} onChange={setDebt} inputMode="decimal" />
        <Field label={t.due} value={due} onChange={setDue} type="date" />
        <Field label={t.until} value={until} onChange={setUntil} type="date" />
        <Check label={t.monitoring} checked={mQ === '1'} onChange={(v) => setM(v ? '1' : '')} />
      </div>
      <details className="more" ref={more}>
        <summary>{t.more}</summary>
        <label className="field wide">
          <span>{t.payments}</span>
          <textarea
            rows={3}
            value={pay}
            spellCheck={false}
            placeholder="10.09.2026 40000"
            onChange={(e) => setPay(e.target.value)}
          />
        </label>
      </details>
      {typeof payments === 'number' ? (
        <Status ok={false}>{t.badLine(payments)}</Status>
      ) : !r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{r.error === 'data' ? t.since : t.messages[r.error]}</Status>
      ) : (
        <>
          <div className="result">
            <div>
              <small>{t.penalty}</small>
              <b>{fmt(r.value.penalty, 2)} ₸</b>
            </div>
            <div>
              <small>{t.total}</small>
              <b>{fmt(r.value.total, 2)} ₸</b>
            </div>
            <div>
              <small>{t.days}</small>
              <b>{r.value.days}</b>
            </div>
          </div>
          {r.value.stale && <Status ok={false}>{t.stale}</Status>}
          {r.value.parts.length > 0 && (
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
                  {r.value.parts.map((p) => (
                    <tr key={p.from}>
                      <td>
                        {fmt(p.amount, 2)} ₸
                        <br />
                        <small>
                          {span(p.from, p.to)}
                          <br />
                          {p.days} {t.day} × {pct(Math.round((p.rate / p.baseRate) * 100) / 100)} ×{' '}
                          {pct(p.baseRate)} %
                        </small>
                      </td>
                      <td>{fmt(p.penalty, 2)} ₸</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="note">{t.note}</p>
          <div className="bar">
            <Share lang={lang} />
          </div>
        </>
      )}
    </>
  )
}
