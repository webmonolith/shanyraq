import { childcarePay, type MaternityLeave, maternityPay } from 'shanyraq/family'
import { kk, ru } from 'shanyraq/i18n'
import { Choice, Field, fmt, Rows, Share, Status, type ToolProps, useQuery } from '../ui'

const LEAVES: MaternityLeave[] = ['normal', 'complicated', 'nuclear', 'nuclearComplicated']
const money = (n: number) => `${fmt(n, 2)} ₸`

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    income: 'Средняя зарплата в месяц, ₸',
    object: 'Доход, с которого платились соцотчисления, ₸',
    basis: 'Сумма',
    bases: [
      ['gross', 'зарплата до удержаний'],
      ['object', 'уже база соцотчислений'],
    ] as const,
    months: (n: number) => `Месяцев с соцотчислениями из ${n}`,
    leave: 'Отпуск',
    leaves: [
      ['normal', 'обычные роды — 126 дней'],
      ['complicated', 'осложнённые роды, двойня — 140 дней'],
      ['nuclear', 'зона ядерных испытаний — 170 дней'],
      ['nuclearComplicated', 'зона испытаний, осложнённые — 184 дня'],
    ] as const,
    order: 'Какой по счёту ребёнок',
    orders: [
      ['1', 'первый'],
      ['2', 'второй'],
      ['3', 'третий'],
      ['4', 'четвёртый и далее'],
    ] as const,
    net: 'На руки',
    netMonthly: 'На руки в месяц',
    average: 'Среднемесячный доход для расчёта',
    days: 'Дней отпуска',
    coefficient: 'Коэффициент (дни / 30)',
    amount: 'Начислено',
    opv: 'ОПВ 10 %',
    byIncome: '40 % среднего дохода',
    min: 'Минимум (пособие по уходу + ОПВ)',
    max: 'Максимум (40 % от 7 МЗП)',
    limitMin: 'Расчёт по доходу ниже минимума — назначается минимальная выплата.',
    limitMax: 'Расчёт по доходу выше максимума — выплата ограничена 40 % от 7 МЗП.',
    noteMaternity:
      'Выплата из ГФСС за весь отпуск по листу нетрудоспособности. Работодатель может доплатить до средней зарплаты, если это есть в трудовом или коллективном договоре (ТК, ст. 99 п. 4).',
    noteChildcare:
      'Выплата из ГФСС ежемесячно, на каждого ребёнка отдельно, до 1,5 лет. Кто не платил соцотчисления, получает пособие из бюджета по ст. 82 — суммы ниже на странице.',
    hint: 'Введите доход.',
    messages: ru.family,
  },
  kk: {
    income: 'Айлық орташа жалақы, ₸',
    object: 'Әлеуметтік аударымдар төленген табыс, ₸',
    basis: 'Сома',
    bases: [
      ['gross', 'ұстап қалғанға дейінгі жалақы'],
      ['object', 'әлеуметтік аударымдар базасы'],
    ] as const,
    months: (n: number) => `${n} айдың ішінде аударымдар төленген айлар`,
    leave: 'Демалыс',
    leaves: [
      ['normal', 'қалыпты босану — 126 күн'],
      ['complicated', 'асқынған босану, егіз — 140 күн'],
      ['nuclear', 'ядролық сынақ аймағы — 170 күн'],
      ['nuclearComplicated', 'сынақ аймағы, асқынған — 184 күн'],
    ] as const,
    order: 'Бала нешінші',
    orders: [
      ['1', 'бірінші'],
      ['2', 'екінші'],
      ['3', 'үшінші'],
      ['4', 'төртінші және одан кейін'],
    ] as const,
    net: 'Қолға',
    netMonthly: 'Айына қолға',
    average: 'Есептеуге арналған орташа айлық табыс',
    days: 'Демалыс күндері',
    coefficient: 'Коэффициент (күн / 30)',
    amount: 'Есептелді',
    opv: 'МЗЖ 10 %',
    byIncome: 'Орташа табыстың 40 %',
    min: 'Ең аз (күтім жәрдемақысы + МЗЖ)',
    max: 'Ең көп (7 ЕТЖ-ның 40 %)',
    limitMin: 'Табыс бойынша есеп ең аз мөлшерден төмен — ең аз төлем тағайындалады.',
    limitMax: 'Табыс бойынша есеп ең көп мөлшерден жоғары — төлем 7 ЕТЖ-ның 40 %-ымен шектеледі.',
    noteMaternity:
      'МӘСҚ төлемі еңбекке уақытша жарамсыздық парағы бойынша бүкіл демалысқа. Еңбек немесе ұжымдық шартта болса, жұмыс беруші орташа жалақыға дейін қосып төлей алады (ЕК, 99-бап 4-т.).',
    noteChildcare:
      'МӘСҚ төлемі ай сайын, әр балаға жеке, 1,5 жасқа дейін. Әлеуметтік аударым төлемегендер 82-бап бойынша бюджеттен жәрдемақы алады — сомалары төменде.',
    hint: 'Табысты енгізіңіз.',
    messages: kk.family,
  },
}

export function FamilyTool({ lang, kind }: ToolProps & { kind: 'maternity' | 'childcare' }) {
  const t = T[lang]
  const [income, setIncome] = useQuery('q', '400000')
  const [basisQ, setBasis] = useQuery('basis', 'gross')
  const basis = basisQ === 'object' ? 'object' : 'gross'
  const period = kind === 'maternity' ? 12 : 24
  const [monthsQ, setMonths] = useQuery('m', '')
  const months = monthsQ.trim() ? Number(monthsQ) : period
  const [leaveQ, setLeave] = useQuery('leave', 'normal')
  const leave = (LEAVES as string[]).includes(leaveQ) ? (leaveQ as MaternityLeave) : 'normal'
  const [orderQ, setOrder] = useQuery('n', '1')
  const order = t.orders.some(([k]) => k === orderQ)
    ? (orderQ as (typeof t.orders)[number][0])
    : '1'

  const common = { gross: basis === 'gross', months }
  const m =
    kind === 'maternity' && income.trim() ? maternityPay(income, { ...common, leave }) : undefined
  const c =
    kind === 'childcare' && income.trim()
      ? childcarePay(income, { ...common, order: Number(order) })
      : undefined
  const r = m ?? c

  return (
    <>
      <div className="grid">
        <Field
          label={basis === 'gross' ? t.income : t.object}
          value={income}
          onChange={setIncome}
          inputMode="decimal"
        />
        <Choice label={t.basis} value={basis} options={t.bases} onChange={setBasis} />
        <Field
          label={t.months(period)}
          value={monthsQ}
          onChange={setMonths}
          placeholder={String(period)}
          inputMode="numeric"
        />
        {kind === 'maternity' ? (
          <Choice label={t.leave} value={leave} options={t.leaves} onChange={setLeave} />
        ) : (
          <Choice label={t.order} value={order} options={t.orders} onChange={setOrder} />
        )}
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          {m?.ok && (
            <>
              <div className="result">
                <div>
                  <small>{t.net}</small>
                  <b>{money(m.value.net)}</b>
                </div>
              </div>
              <Rows
                lang={lang}
                rows={[
                  [t.average, money(m.value.average)],
                  [t.days, String(m.value.days)],
                  [t.coefficient, String(m.value.coefficient).replace('.', ',')],
                  [t.amount, money(m.value.amount)],
                  [t.opv, money(m.value.opv)],
                ]}
              />
              <p className="note">{t.noteMaternity}</p>
            </>
          )}
          {c?.ok && (
            <>
              <div className="result">
                <div>
                  <small>{t.netMonthly}</small>
                  <b>{money(c.value.net)}</b>
                </div>
              </div>
              {c.value.limit && (
                <Status>{c.value.limit === 'min' ? t.limitMin : t.limitMax}</Status>
              )}
              <Rows
                lang={lang}
                rows={[
                  [t.average, money(c.value.average)],
                  [t.byIncome, money(c.value.byIncome)],
                  [t.min, money(c.value.min)],
                  [t.max, money(c.value.max)],
                  [t.amount, money(c.value.amount)],
                  [t.opv, money(c.value.opv)],
                ]}
              />
              <p className="note">{t.noteChildcare}</p>
            </>
          )}
          <div className="bar">
            <Share lang={lang} />
          </div>
        </>
      )}
    </>
  )
}

export default function Maternity({ lang }: ToolProps) {
  return <FamilyTool lang={lang} kind="maternity" />
}
