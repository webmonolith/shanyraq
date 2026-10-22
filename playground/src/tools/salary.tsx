import { useState } from 'react'
import { kk, ru } from 'shanyraq/i18n'
import { calculateSalary, getTaxYear, grossFromNet } from 'shanyraq/tax'
import { Check, Choice, Field, fmt, Rows, Share, Status, type ToolProps, useQuery } from '../ui'

const YEAR = getTaxYear() as { year: number; mrp: number; mzp: number }

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    mode: 'Что известно',
    modes: [
      ['gross', 'оклад (начислено)'],
      ['net', 'сумма на руки'],
    ] as const,
    amount: 'Сумма в месяц, ₸',
    month: 'Месяц',
    months: [
      'январь',
      'февраль',
      'март',
      'апрель',
      'май',
      'июнь',
      'июль',
      'август',
      'сентябрь',
      'октябрь',
      'ноябрь',
      'декабрь',
    ],
    deduction: `Базовый вычет 30 МРП (${fmt(30 * YEAR.mrp)} ₸) — по заявлению работника`,
    employee: 'Удержания из зарплаты',
    employer: 'Платит работодатель сверху',
    gross: 'Оклад (начислено)',
    opv: 'ОПВ — пенсионные взносы, 10 %',
    vosms: 'ВОСМС — медстрахование, 2 %',
    ipn: 'ИПН — подоходный налог',
    net: 'На руки',
    opvr: 'ОПВР — пенсионные взносы работодателя, 3,5 %',
    so: 'СО — социальные отчисления, 5 %',
    oosms: 'ООСМС — медстрахование, 3 %',
    sn: 'СН — социальный налог, 6 %',
    cost: 'Всего расходы работодателя',
    year: 'По месяцам за год',
    yearHint:
      'Годовой доход выше 8 500 МРП: ИПН 15 % удерживается с месяца, когда облагаемый доход с начала года превысит порог.',
    head: ['Месяц', 'ИПН', 'На руки'],
    total: 'Итого за год',
    note: `Ставки ${YEAR.year} года: МРП ${fmt(YEAR.mrp)} ₸, МЗП ${fmt(YEAR.mzp)} ₸. Резидент, общеустановленный режим, без льгот.`,
    messages: ru.tax,
  },
  kk: {
    mode: 'Не белгілі',
    modes: [
      ['gross', 'жалақы (есептелген)'],
      ['net', 'қолға тиетін сома'],
    ] as const,
    amount: 'Айлық сома, ₸',
    month: 'Ай',
    months: [
      'қаңтар',
      'ақпан',
      'наурыз',
      'сәуір',
      'мамыр',
      'маусым',
      'шілде',
      'тамыз',
      'қыркүйек',
      'қазан',
      'қараша',
      'желтоқсан',
    ],
    deduction: `30 АЕК базалық шегерім (${fmt(30 * YEAR.mrp)} ₸) — қызметкердің өтініші бойынша`,
    employee: 'Жалақыдан ұсталатындар',
    employer: 'Жұмыс беруші үстінен төлейді',
    gross: 'Жалақы (есептелген)',
    opv: 'МЗЖ — зейнетақы жарналары, 10 %',
    vosms: 'МӘМСҚ жарнасы — медициналық сақтандыру, 2 %',
    ipn: 'ЖТС — жеке табыс салығы',
    net: 'Қолға',
    opvr: 'ЖМЗЖ — жұмыс берушінің зейнетақы жарналары, 3,5 %',
    so: 'ӘА — әлеуметтік аударымдар, 5 %',
    oosms: 'МӘМСҚ аударымы — медициналық сақтандыру, 3 %',
    sn: 'ӘС — әлеуметтік салық, 6 %',
    cost: 'Жұмыс берушінің барлық шығыны',
    year: 'Жыл бойы айлар бойынша',
    yearHint:
      'Жылдық табыс 8 500 АЕК-тен жоғары: ЖТС 15 % жыл басынан бергі салық салынатын табыс шектен асқан айдан бастап ұсталады.',
    head: ['Ай', 'ЖТС', 'Қолға'],
    total: 'Жыл бойы барлығы',
    note: `${YEAR.year} жылғы мөлшерлемелер: АЕК ${fmt(YEAR.mrp)} ₸, ЕТЖ ${fmt(YEAR.mzp)} ₸. Резидент, жалпыға бірдей режим, жеңілдіксіз.`,
    messages: kk.tax,
  },
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function SalaryTool({ lang }: ToolProps) {
  const t = T[lang]
  const [value, setValue] = useQuery('q', '500000')
  const [mode, setMode] = useState<'gross' | 'net'>('gross')
  const [month, setMonth] = useState('1')
  const [deduction, setDeduction] = useState(true)
  const options = { month: Number(month), baseDeduction: deduction }
  const r = value.trim()
    ? (mode === 'gross' ? calculateSalary : grossFromNet)(value, options)
    : undefined
  const year = r?.ok
    ? MONTHS.flatMap((m) => {
        const s = calculateSalary(r.value.gross, { ...options, month: m })
        return s.ok ? [s.value] : []
      })
    : []
  const progressive = year.some((s) => s.ipn !== year[0]?.ipn)
  const money = (n: number) => `${fmt(n)} ₸`
  const ipnPct =
    r?.ok && r.value.taxable > 0 ? ` (${Math.round((r.value.ipn / r.value.taxable) * 100)} %)` : ''
  return (
    <>
      <div className="grid">
        <Choice label={t.mode} value={mode} options={t.modes} onChange={setMode} />
        <Field label={t.amount} value={value} onChange={setValue} inputMode="decimal" />
        <Choice
          label={t.month}
          value={month}
          options={t.months.map((name, i) => [String(i + 1), name] as const)}
          onChange={setMonth}
        />
      </div>
      <div className="bar">
        <Check label={t.deduction} checked={deduction} onChange={setDeduction} />
        {r?.ok && <Share lang={lang} />}
      </div>
      {!r ? (
        <Status>{t.note}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          <div className="result">
            <div>
              <small>{t.net}</small>
              <b>{money(r.value.net)}</b>
            </div>
            <div>
              <small>{t.gross}</small>
              <b>{money(r.value.gross)}</b>
            </div>
            <div>
              <small>{t.cost}</small>
              <b>{money(r.value.employerCost)}</b>
            </div>
          </div>
          <h3>{t.employee}</h3>
          <Rows
            lang={lang}
            rows={[
              [t.gross, money(r.value.gross)],
              [t.opv, `− ${money(r.value.opv)}`],
              [t.vosms, `− ${money(r.value.vosms)}`],
              [t.ipn + ipnPct, `− ${money(r.value.ipn)}`],
              [t.net, <b key="n">{money(r.value.net)}</b>],
            ]}
          />
          <h3>{t.employer}</h3>
          <Rows
            lang={lang}
            rows={[
              [t.opvr, money(r.value.opvr)],
              [t.so, money(r.value.so)],
              [t.oosms, money(r.value.oosms)],
              [t.sn, money(r.value.sn)],
              [t.cost, <b key="c">{money(r.value.employerCost)}</b>],
            ]}
          />
          {progressive && (
            <>
              <h3>{t.year}</h3>
              <Status>{t.yearHint}</Status>
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
                    {year.map((s, i) => (
                      <tr key={t.months[i]}>
                        <td>{t.months[i]}</td>
                        <td>{money(s.ipn)}</td>
                        <td>{money(s.net)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td>{t.total}</td>
                      <td>{money(year.reduce((a, s) => a + s.ipn, 0))}</td>
                      <td>{money(year.reduce((a, s) => a + s.net, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
          <Status>{t.note}</Status>
        </>
      )}
    </>
  )
}
