import { useEffect, useRef, useState } from 'react'
import { kk, ru } from 'shanyraq/i18n'
import {
  type GesvLoanKind,
  gesvLimit,
  type Loan,
  type LoanMethod,
  loanSchedule,
} from 'shanyraq/loan'
import { programmes } from '../../../data/loan.json'
import { Choice, Field, fmt, Share, Status, type ToolProps, useQuery } from '../ui'

type Mode = 'loan' | 'mortgage'

const dmy = (iso: string) => iso.split('-').reverse().join('.')
const num = (s: string) => Number(s.replace(/[\s ]/g, '').replace(',', '.'))
const pct = (v: number) => String(v).replace('.', ',')

// Mortgage presets from data/loan.json; Otbasy programmes come with a social and a general rate.
const PRESETS = programmes
  .filter((p) => p.maxYears !== undefined)
  .flatMap((p) => {
    const base = { id: p.id, name: p.name, minDown: p.minDownPayment, years: p.maxYears as number }
    return p.rateSocial === undefined
      ? [{ ...base, rate: p.rate }]
      : [
          { ...base, rate: p.rate },
          { ...base, id: `${p.id}-social`, rate: p.rateSocial },
        ]
  })

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    amount: 'Сумма кредита, ₸',
    price: 'Стоимость жилья, ₸',
    down: 'Первоначальный взнос, %',
    rate: 'Ставка, % годовых',
    months: 'Срок, месяцев',
    years: 'Срок, лет',
    method: 'Погашение',
    methods: [
      ['annuity', 'аннуитетное (равными платежами)'],
      ['differentiated', 'дифференцированное'],
    ] as const,
    kind: 'Вид займа',
    kinds: [
      ['unsecured', 'беззалоговый'],
      ['secured', 'с залогом'],
      ['mortgage', 'ипотечный'],
      ['microcredit', 'микрокредит МФО'],
    ] as const,
    programme: 'Программа',
    own: 'своя ставка',
    social: '(соц. уязвимые)',
    more: 'Дата выдачи, комиссии, досрочное погашение',
    start: 'Дата выдачи',
    fee: 'Комиссия при выдаче, ₸',
    monthlyFee: 'Комиссия в месяц, ₸',
    prepay: 'Досрочно: месяц',
    prepayAmount: 'Досрочно: сумма, ₸',
    reduce: 'После досрочного',
    reduces: [
      ['term', 'сократить срок'],
      ['payment', 'уменьшить платёж'],
    ] as const,
    extra: 'Доплата каждый месяц, ₸',
    monthly: 'Ежемесячный платёж',
    firstLast: 'Первый → последний платёж',
    overpayment: 'Переплата',
    gesv: 'ГЭСВ',
    total: 'Всего выплат',
    loan: 'Сумма кредита',
    paidIn: (n: number) => `Кредит закроется за ${n} мес.`,
    other: (name: string, v: number, d: number) =>
      `${name}: переплата ${fmt(v, 2)} ₸ (${d < 0 ? 'меньше' : 'больше'} на ${fmt(Math.abs(d), 2)} ₸).`,
    otherName: { annuity: 'Аннуитетно', differentiated: 'Дифференцированно' },
    capOk: (cap: number) => `Не выше предельной ГЭСВ ${pct(cap)} % для этого вида займа.`,
    capBad: (cap: number) =>
      `Выше предельной ГЭСВ ${pct(cap)} % — по такому договору банк или МФО выдать заём не вправе.`,
    downLow: (min: number) => `По условиям программы взнос — от ${min} %.`,
    tooLong: (max: number) => `По условиям программы срок — до ${max} лет.`,
    schedule: (n: number) => `График платежей (${n})`,
    head: ['№', 'Дата', 'Платёж', 'Основной долг', 'Вознаграждение', 'Досрочно', 'Остаток'],
    download: 'Скачать CSV',
    hint: 'Введите сумму и ставку.',
    note: 'Вознаграждение за месяц = остаток × ставка / 12. Без даты выдачи месяц считается равным 365/12 дня.',
    messages: ru.loan,
  },
  kk: {
    amount: 'Несие сомасы, ₸',
    price: 'Тұрғын үй құны, ₸',
    down: 'Бастапқы жарна, %',
    rate: 'Мөлшерлеме, жылдық %',
    months: 'Мерзімі, ай',
    years: 'Мерзімі, жыл',
    method: 'Өтеу',
    methods: [
      ['annuity', 'аннуитетті (тең төлемдер)'],
      ['differentiated', 'сараланған'],
    ] as const,
    kind: 'Қарыз түрі',
    kinds: [
      ['unsecured', 'кепілсіз'],
      ['secured', 'кепілмен'],
      ['mortgage', 'ипотекалық'],
      ['microcredit', 'МҚҰ микрокредиті'],
    ] as const,
    programme: 'Бағдарлама',
    own: 'өз мөлшерлемем',
    social: '(әлеуметтік осал)',
    more: 'Берілген күні, комиссиялар, мерзімінен бұрын өтеу',
    start: 'Берілген күні',
    fee: 'Беру кезіндегі комиссия, ₸',
    monthlyFee: 'Айлық комиссия, ₸',
    prepay: 'Мерзімінен бұрын: ай',
    prepayAmount: 'Мерзімінен бұрын: сома, ₸',
    reduce: 'Мерзімінен бұрын өтегеннен кейін',
    reduces: [
      ['term', 'мерзімді қысқарту'],
      ['payment', 'төлемді азайту'],
    ] as const,
    extra: 'Ай сайынғы қосымша төлем, ₸',
    monthly: 'Ай сайынғы төлем',
    firstLast: 'Бірінші → соңғы төлем',
    overpayment: 'Артық төлем',
    gesv: 'ЖТСМ',
    total: 'Барлық төлемдер',
    loan: 'Несие сомасы',
    paidIn: (n: number) => `Несие ${n} айда жабылады.`,
    other: (name: string, v: number, d: number) =>
      `${name}: артық төлем ${fmt(v, 2)} ₸ (${fmt(Math.abs(d), 2)} ₸ ${d < 0 ? 'аз' : 'көп'}).`,
    otherName: { annuity: 'Аннуитетті', differentiated: 'Сараланған' },
    capOk: (cap: number) => `Осы қарыз түрі үшін шекті ЖТСМ ${pct(cap)} %-дан аспайды.`,
    capBad: (cap: number) =>
      `Шекті ЖТСМ ${pct(cap)} %-дан жоғары — мұндай шартпен банк немесе МҚҰ қарыз бере алмайды.`,
    downLow: (min: number) => `Бағдарлама шарты бойынша жарна — ${min} %-дан.`,
    tooLong: (max: number) => `Бағдарлама шарты бойынша мерзімі — ${max} жылға дейін.`,
    schedule: (n: number) => `Төлем кестесі (${n})`,
    head: ['№', 'Күні', 'Төлем', 'Негізгі борыш', 'Сыйақы', 'Мерзімінен бұрын', 'Қалдық'],
    download: 'CSV жүктеп алу',
    hint: 'Соманы және мөлшерлемені енгізіңіз.',
    note: 'Айлық сыйақы = қалдық × мөлшерлеме / 12. Берілген күні болмаса, ай 365/12 күнге тең деп алынады.',
    messages: kk.loan,
  },
}

const download = (loan: Loan, t: { head: string[] }) => {
  const lines = [
    t.head,
    ...loan.payments.map((p) => [
      String(p.n),
      p.date ? dmy(p.date) : '',
      ...[p.payment, p.principal, p.interest, p.prepayment, p.balance].map((v) =>
        v.toFixed(2).replace('.', ','),
      ),
    ]),
  ].map((cells) => cells.join(';'))
  // BOM so Excel opens Cyrillic as UTF-8
  const blob = new Blob([`﻿${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'shanyraq-loan.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export function LoanTool({ lang, mode }: ToolProps & { mode: Mode }) {
  const t = T[lang]
  const mortgage = mode === 'mortgage'
  const [amount, setAmount] = useQuery('q', mortgage ? '25000000' : '1000000')
  const [down, setDown] = useQuery('down', '20')
  const [rate, setRate] = useQuery('rate', mortgage ? '7' : '20')
  const [term, setTerm] = useQuery('term', mortgage ? '25' : '12')
  const [methodQ, setMethod] = useQuery('method', 'annuity')
  const [kindQ, setKind] = useQuery('kind', 'unsecured')
  const [programme, setProgramme] = useQuery('prog', mortgage ? '72025' : '')
  const [start, setStart] = useQuery('start', '')
  const [fee, setFee] = useQuery('fee', '')
  const [monthlyFee, setMonthlyFee] = useQuery('mfee', '')
  const [prepayMonth, setPrepayMonth] = useQuery('pm', '')
  const [prepayAmount, setPrepayAmount] = useQuery('pa', '')
  const [reduceQ, setReduce] = useQuery('reduce', 'term')
  const [extra, setExtra] = useQuery('extra', '')
  // The ГЭСВ cap depends on the date; today is known only after hydration.
  const [today, setToday] = useState('')
  useEffect(() => {
    const d = new Date()
    setToday(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    )
  }, [])

  // Opens once the URL has been read, so shared links with fees or prepayments show them.
  const more = useRef<HTMLDetailsElement>(null)
  const advanced = Boolean(start || fee || monthlyFee || prepayMonth || prepayAmount || extra)
  useEffect(() => {
    if (advanced && more.current) more.current.open = true
  }, [advanced])

  const method: LoanMethod = methodQ === 'differentiated' ? 'differentiated' : 'annuity'
  const kind = (
    mortgage ? 'mortgage' : (t.kinds.find(([k]) => k === kindQ)?.[0] ?? 'unsecured')
  ) as GesvLoanKind
  const reduce: 'term' | 'payment' = reduceQ === 'payment' ? 'payment' : 'term'
  const preset = PRESETS.find((p) => p.id === programme)
  const pickProgramme = (id: string) => {
    setProgramme(id)
    const p = PRESETS.find((x) => x.id === id)
    if (p) {
      setRate(String(p.rate))
      setTerm(String(p.years))
      if (num(down) < p.minDown) setDown(String(p.minDown))
    }
  }

  const price = num(amount)
  const principal = mortgage ? Math.round(price * (1 - num(down) / 100) * 100) / 100 : price
  const months = mortgage ? Math.round(num(term) * 12) : num(term)
  const prepayments = [
    ...(num(prepayMonth) > 0 && num(prepayAmount) > 0
      ? [{ month: num(prepayMonth), amount: num(prepayAmount), reduce }]
      : []),
    ...(num(extra) > 0
      ? Array.from({ length: months }, (_, i) => ({ month: i + 1, amount: num(extra), reduce }))
      : []),
  ]
  const options = {
    fee: num(fee) || 0,
    monthlyFee: num(monthlyFee) || 0,
    prepayments,
    ...(start ? { start } : {}),
  }
  const input = mortgage ? principal : amount
  const r =
    !amount.trim() || !rate.trim()
      ? undefined
      : loanSchedule(input, num(rate), months, { ...options, method })
  const other = !r?.ok
    ? undefined
    : loanSchedule(input, num(rate), months, {
        ...options,
        method: method === 'annuity' ? 'differentiated' : 'annuity',
      })
  const capDate = start || today
  const ltv = mortgage && price > 0 ? principal / price : undefined
  const cap = capDate ? gesvLimit(kind, capDate, ltv) : undefined
  const loan = r?.ok ? r.value : undefined
  const last = loan?.payments.at(-1)

  return (
    <>
      <div className="grid">
        {mortgage && (
          <Choice
            label={t.programme}
            value={preset ? programme : ''}
            options={[
              ['', t.own],
              ...PRESETS.map(
                (p) =>
                  [
                    p.id,
                    `${p.name} — ${pct(p.rate)} %${p.id.endsWith('-social') ? ` ${t.social}` : ''}`,
                  ] as const,
              ),
            ]}
            onChange={pickProgramme}
          />
        )}
        <Field
          label={mortgage ? t.price : t.amount}
          value={amount}
          onChange={setAmount}
          inputMode="decimal"
        />
        {mortgage && <Field label={t.down} value={down} onChange={setDown} inputMode="decimal" />}
        <Field
          label={t.rate}
          value={rate}
          onChange={(v) => {
            setRate(v)
            setProgramme('')
          }}
          inputMode="decimal"
        />
        <Field
          label={mortgage ? t.years : t.months}
          value={term}
          onChange={setTerm}
          inputMode="numeric"
        />
        <Choice label={t.method} value={method} options={t.methods} onChange={setMethod} />
        {!mortgage && <Choice label={t.kind} value={kind} options={t.kinds} onChange={setKind} />}
      </div>
      <details className="more" ref={more}>
        <summary>{t.more}</summary>
        <div className="grid">
          <Field label={t.start} value={start} onChange={setStart} type="date" />
          <Field label={t.fee} value={fee} onChange={setFee} inputMode="decimal" placeholder="0" />
          <Field
            label={t.monthlyFee}
            value={monthlyFee}
            onChange={setMonthlyFee}
            inputMode="decimal"
            placeholder="0"
          />
          <Field
            label={t.prepay}
            value={prepayMonth}
            onChange={setPrepayMonth}
            inputMode="numeric"
          />
          <Field
            label={t.prepayAmount}
            value={prepayAmount}
            onChange={setPrepayAmount}
            inputMode="decimal"
          />
          <Field
            label={t.extra}
            value={extra}
            onChange={setExtra}
            inputMode="decimal"
            placeholder="0"
          />
          <Choice label={t.reduce} value={reduce} options={t.reduces} onChange={setReduce} />
        </div>
      </details>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        loan &&
        last && (
          <>
            <div className="result result--2">
              <div>
                <small>{method === 'annuity' ? t.monthly : t.firstLast}</small>
                <b>
                  {fmt(loan.monthly, 2)}
                  {method === 'differentiated' && ` → ${fmt(last.payment - last.prepayment, 2)}`} ₸
                </b>
              </div>
              <div>
                <small>{t.overpayment}</small>
                <b>{fmt(loan.overpayment, 2)} ₸</b>
              </div>
              <div>
                <small>{t.gesv}</small>
                <b>{pct(loan.apr)} %</b>
              </div>
              <div>
                <small>{mortgage ? t.loan : t.total}</small>
                <b>{fmt(mortgage ? principal : loan.total, 2)} ₸</b>
              </div>
            </div>
            {cap?.ok && (
              <Status ok={loan.apr <= cap.value}>
                {loan.apr <= cap.value ? t.capOk(cap.value) : t.capBad(cap.value)}
              </Status>
            )}
            {preset && num(down) < preset.minDown && (
              <Status ok={false}>{t.downLow(preset.minDown)}</Status>
            )}
            {preset && num(term) > preset.years && (
              <Status ok={false}>{t.tooLong(preset.years)}</Status>
            )}
            {loan.payments.length < months && (
              <p className="note">{t.paidIn(loan.payments.length)}</p>
            )}
            {other?.ok && (
              <p className="note">
                {t.other(
                  t.otherName[method === 'annuity' ? 'differentiated' : 'annuity'],
                  other.value.overpayment,
                  other.value.overpayment - loan.overpayment,
                )}
              </p>
            )}
            <details className="schedule">
              <summary>{t.schedule(loan.payments.length)}</summary>
              <div className="table scroll">
                <table>
                  <thead>
                    <tr>
                      {t.head.map((h, i) => (i === 1 && !start ? null : <th key={h}>{h}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {loan.payments.map((p) => (
                      <tr key={p.n}>
                        <td>{p.n}</td>
                        {p.date && <td>{dmy(p.date)}</td>}
                        <td>{fmt(p.payment, 2)}</td>
                        <td>{fmt(p.principal, 2)}</td>
                        <td>{fmt(p.interest, 2)}</td>
                        <td>{p.prepayment ? fmt(p.prepayment, 2) : '—'}</td>
                        <td>{fmt(p.balance, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <p className="note">{t.note}</p>
            <div className="bar">
              <Share lang={lang} />
              <button type="button" className="ghost" onClick={() => download(loan, t)}>
                {t.download}
              </button>
            </div>
          </>
        )
      )}
    </>
  )
}

export default function LoanPage({ lang }: ToolProps) {
  return <LoanTool lang={lang} mode="loan" />
}
