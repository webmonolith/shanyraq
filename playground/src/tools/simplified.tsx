import { kk, ru } from 'shanyraq/i18n'
import { getTaxYear, simplifiedTax } from 'shanyraq/tax'
import { Field, fmt, Rows, Share, Status, type ToolProps, useQuery } from '../ui'

const YEAR = getTaxYear() as { year: number; mrp: number; mzp: number }

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    income: 'Доход за полугодие, ₸',
    rate: 'Ставка, % (4 или решение маслихата 2–6)',
    declared: 'Доход для взносов за себя, ₸ в месяц',
    ipn: 'ИПН за полугодие',
    contributions: 'Взносы за себя за 6 месяцев',
    total: 'Всего за полугодие',
    opv: 'ОПВ — пенсионные взносы, 10 %, в месяц',
    so: 'СО — социальные отчисления, 5 %, в месяц',
    vosms: 'ВОСМС — медстрахование, 5 % от 1,4 МЗП, в месяц',
    limit: 'Лимит дохода за год (600 000 МРП)',
    over: 'Доход выше годового лимита упрощённой декларации.',
    deadlines: 'Сроки',
    deadlinesText:
      'Декларация 910 — до 15 августа (за 1-е полугодие) и до 15 февраля (за 2-е), ИПН — до 25 числа того же месяца. Взносы за себя — ежемесячно до 25 числа следующего месяца.',
    hint: 'Например 3 000 000.',
    note: `МЗП ${YEAR.year} — ${fmt(YEAR.mzp)} ₸, МРП — ${fmt(YEAR.mrp)} ₸. Без работников и без доходов у источника выплаты.`,
    messages: ru.tax,
  },
  kk: {
    income: 'Жартыжылдықтағы табыс, ₸',
    rate: 'Мөлшерлеме, % (4 немесе мәслихат шешімі 2–6)',
    declared: 'Өзі үшін жарналарға табыс, айына ₸',
    ipn: 'Жартыжылдыққа ЖТС',
    contributions: '6 айға өзі үшін жарналар',
    total: 'Жартыжылдыққа барлығы',
    opv: 'МЗЖ — зейнетақы жарналары, 10 %, айына',
    so: 'ӘА — әлеуметтік аударымдар, 5 %, айына',
    vosms: 'МӘМСҚ — 1,4 ЕТЖ-дан 5 %, айына',
    limit: 'Жылдық табыс шегі (600 000 АЕК)',
    over: 'Табыс оңайлатылған декларацияның жылдық шегінен асады.',
    deadlines: 'Мерзімдер',
    deadlinesText:
      '910 декларация — 15 тамызға дейін (1-жартыжылдық) және 15 ақпанға дейін (2-жартыжылдық), ЖТС — сол айдың 25-іне дейін. Өзі үшін жарналар — ай сайын келесі айдың 25-іне дейін.',
    hint: 'Мысалы 3 000 000.',
    note: `${YEAR.year} жылғы ЕТЖ — ${fmt(YEAR.mzp)} ₸, АЕК — ${fmt(YEAR.mrp)} ₸. Қызметкерлерсіз және төлем көзінен салынатын табыссыз.`,
    messages: kk.tax,
  },
}

const num = (s: string) => Number(s.replace(/[\s ]/g, '').replace(',', '.'))

export default function Simplified({ lang }: ToolProps) {
  const t = T[lang]
  const [income, setIncome] = useQuery('q', '3000000')
  const [rate, setRate] = useQuery('rate', '4')
  const [declared, setDeclared] = useQuery('declared', String(YEAR.mzp))
  const r = income.trim()
    ? simplifiedTax(income, { rate: num(rate), declared: declared.trim() || YEAR.mzp })
    : undefined
  return (
    <>
      <div className="grid">
        <Field label={t.income} value={income} onChange={setIncome} inputMode="decimal" />
        <Field label={t.rate} value={rate} onChange={setRate} inputMode="decimal" />
        <Field label={t.declared} value={declared} onChange={setDeclared} inputMode="decimal" />
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          <div className="result">
            <div>
              <small>{t.total}</small>
              <b>{fmt(r.value.total)} ₸</b>
            </div>
            <div>
              <small>{t.ipn}</small>
              <b>{fmt(r.value.ipn)} ₸</b>
            </div>
            <div>
              <small>{t.contributions}</small>
              <b>{fmt(r.value.contributions)} ₸</b>
            </div>
          </div>
          {r.value.income > r.value.limit && <Status ok={false}>{t.over}</Status>}
          <Rows
            lang={lang}
            rows={[
              [t.opv, `${fmt(r.value.monthly.opv)} ₸`],
              [t.so, `${fmt(r.value.monthly.so)} ₸`],
              [t.vosms, `${fmt(r.value.monthly.vosms)} ₸`],
              [t.limit, `${fmt(r.value.limit)} ₸`],
            ]}
          />
          <h3>{t.deadlines}</h3>
          <p>{t.deadlinesText}</p>
          <p className="note">{t.note}</p>
          <div className="bar">
            <Share lang={lang} />
          </div>
        </>
      )}
    </>
  )
}
