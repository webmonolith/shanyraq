import { useEffect, useRef } from 'react'
import { claimDuty, claimPenalty } from 'shanyraq/claim'
import { kk, ru } from 'shanyraq/i18n'
import {
  Check,
  Choice,
  dmy,
  Field,
  fmt,
  num,
  parsePayments,
  Share,
  Status,
  type ToolProps,
  useQuery,
} from '../ui'

type Mode = 'parts' | 'until' | 'custom'
const MODES: Mode[] = ['parts', 'until', 'custom']

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    debt: 'Сумма долга, ₸',
    due: 'Последний день оплаты по договору',
    until: 'Дата расчёта (оплаты или подачи иска)',
    mode: 'Ставка',
    modes: [
      ['parts', 'базовая на день оплаты каждой части'],
      ['until', 'базовая на дату расчёта (иска, решения)'],
      ['custom', 'своя по договору, % годовых'],
    ] as const,
    rate: 'Ставка, % годовых',
    basis: 'Дней в году',
    bases: [
      ['365', '365'],
      ['360', '360'],
    ] as const,
    payer: 'Истец',
    payers: [
      ['individual', 'физическое лицо — 1 %'],
      ['legal', 'юридическое лицо — 3 %'],
    ] as const,
    order: 'Заявление о судебном приказе (50 % пошлины)',
    more: 'Частичные оплаты',
    payments: 'Каждая строка — дата и сумма: 10.06.2026 400000',
    badLine: (n: number) => `Строка ${n} частичных оплат: ожидается «ДД.ММ.ГГГГ сумма».`,
    penalty: 'Неустойка по ст. 353',
    total: 'Цена иска',
    duty: 'Госпошлина',
    capped: (mrp: string) => `Пошлина ограничена максимумом ${mrp}.`,
    head: ['Часть долга', 'Неустойка'],
    days: 'дн.',
    paid: 'оплачено',
    unpaid: 'остаток на',
    stale:
      'Дата позже последнего известного решения Нацбанка по базовой ставке — ставка могла измениться, проверьте на nationalbank.kz.',
    note: 'Неустойка считается со дня после срока оплаты по день оплаты включительно. Если договор устанавливает свою неустойку, применяется она (ст. 353 п. 1).',
    hint: 'Введите сумму долга и даты.',
    messages: ru.claim,
  },
  kk: {
    debt: 'Қарыз сомасы, ₸',
    due: 'Шарт бойынша төлеудің соңғы күні',
    until: 'Есеп күні (төлем немесе талап қою күні)',
    mode: 'Мөлшерлеме',
    modes: [
      ['parts', 'әр бөлік төленген күнгі базалық'],
      ['until', 'есеп күнгі базалық (талап, шешім)'],
      ['custom', 'шарт бойынша өз мөлшерлемесі, жылдық %'],
    ] as const,
    rate: 'Мөлшерлеме, жылдық %',
    basis: 'Жылдағы күн саны',
    bases: [
      ['365', '365'],
      ['360', '360'],
    ] as const,
    payer: 'Талапкер',
    payers: [
      ['individual', 'жеке тұлға — 1 %'],
      ['legal', 'заңды тұлға — 3 %'],
    ] as const,
    order: 'Сот бұйрығын шығару туралы өтініш (баждың 50 %)',
    more: 'Ішінара төлемдер',
    payments: 'Әр жол — күні мен сомасы: 10.06.2026 400000',
    badLine: (n: number) => `Ішінара төлемдердің ${n}-жолы: «КК.АА.ЖЖЖЖ сома» күтіледі.`,
    penalty: '353-бап бойынша тұрақсыздық айыбы',
    total: 'Талап бағасы',
    duty: 'Мемлекеттік баж',
    capped: (mrp: string) => `Баж ең жоғары мөлшермен шектелді: ${mrp}.`,
    head: ['Қарыз бөлігі', 'Айып'],
    days: 'күн',
    paid: 'төленді',
    unpaid: 'қалдық',
    stale:
      'Күн Ұлттық Банктің базалық мөлшерлеме бойынша соңғы белгілі шешімінен кейін — мөлшерлеме өзгеруі мүмкін, nationalbank.kz сайтынан тексеріңіз.',
    note: 'Айып төлеу мерзімінен кейінгі күннен бастап төлем күнін қоса есептеледі. Шартта өз айыбы белгіленсе, сол қолданылады (353-бап 1-т.).',
    hint: 'Қарыз сомасы мен күндерді енгізіңіз.',
    messages: kk.claim,
  },
}

export default function Claim({ lang }: ToolProps) {
  const t = T[lang]
  const [debt, setDebt] = useQuery('q', '1000000')
  const [due, setDue] = useQuery('due', '2026-01-31')
  const [until, setUntil] = useQuery('to', '2026-10-01')
  const [modeQ, setMode] = useQuery('rate', 'parts')
  const mode = (MODES as string[]).includes(modeQ) ? (modeQ as Mode) : 'parts'
  const [rate, setRate] = useQuery('r', '')
  const [basisQ, setBasis] = useQuery('b', '365')
  const basis = basisQ === '360' ? '360' : '365'
  const [payerQ, setPayer] = useQuery('payer', 'individual')
  const payer = payerQ === 'legal' ? 'legal' : 'individual'
  const [orderQ, setOrder] = useQuery('order', '')
  const [pay, setPay] = useQuery('pay', '')

  // Opens once the URL has been read, so shared links with payments show them.
  const more = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (pay && more.current) more.current.open = true
  }, [pay])

  const payments = parsePayments(pay)
  const r =
    debt.trim() && due && until && typeof payments !== 'number'
      ? claimPenalty(debt, due, until, {
          payments,
          basis: Number(basis) as 360 | 365,
          ...(mode === 'until' ? { rateDate: until } : {}),
          ...(mode === 'custom' ? { rate: num(rate || 'x') } : {}),
        })
      : undefined
  const duty = r?.ok ? claimDuty(r.value.total, { payer, courtOrder: orderQ === '1' }) : undefined

  return (
    <>
      <div className="grid">
        <Field label={t.debt} value={debt} onChange={setDebt} inputMode="decimal" />
        <Field label={t.due} value={due} onChange={setDue} type="date" />
        <Field label={t.until} value={until} onChange={setUntil} type="date" />
        <Choice label={t.mode} value={mode} options={t.modes} onChange={setMode} />
        {mode === 'custom' && (
          <Field label={t.rate} value={rate} onChange={setRate} inputMode="decimal" />
        )}
        <Choice label={t.basis} value={basis} options={t.bases} onChange={setBasis} />
        <Choice label={t.payer} value={payer} options={t.payers} onChange={setPayer} />
        <Check label={t.order} checked={orderQ === '1'} onChange={(v) => setOrder(v ? '1' : '')} />
      </div>
      <details className="more" ref={more}>
        <summary>{t.more}</summary>
        <label className="field wide">
          <span>{t.payments}</span>
          <textarea
            rows={3}
            value={pay}
            spellCheck={false}
            placeholder="10.06.2026 400000"
            onChange={(e) => setPay(e.target.value)}
          />
        </label>
      </details>
      {typeof payments === 'number' ? (
        <Status ok={false}>{t.badLine(payments)}</Status>
      ) : !r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
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
            {duty?.ok && (
              <div>
                <small>
                  {t.duty} {String(duty.value.percent).replace('.', ',')} %
                </small>
                <b>{fmt(duty.value.duty, 2)} ₸</b>
              </div>
            )}
          </div>
          {r.value.stale && <Status ok={false}>{t.stale}</Status>}
          {duty?.ok && duty.value.capped && (
            <Status>{t.capped(`${fmt(duty.value.duty, 2)} ₸`)}</Status>
          )}
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
                  <tr key={`${p.date}${p.paid}${p.amount}`}>
                    <td>
                      {fmt(p.amount, 2)} ₸
                      <br />
                      <small>
                        {p.paid ? t.paid : t.unpaid} {dmy(p.date)}
                        <br />
                        {p.days} {t.days} × {String(p.rate).replace('.', ',')} %
                      </small>
                    </td>
                    <td>{fmt(p.penalty, 2)} ₸</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">{t.note}</p>
          <div className="bar">
            <Share lang={lang} />
          </div>
        </>
      )}
    </>
  )
}
