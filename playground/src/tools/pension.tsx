import { useEffect, useState } from 'react'
import { kk, ru } from 'shanyraq/i18n'
import {
  agePension,
  basicPension,
  type EarlyRetirement,
  pensionContributions,
  retirementAge,
} from 'shanyraq/pension'
import {
  Check,
  Choice,
  dmy,
  Field,
  fmt,
  num,
  Rows,
  Share,
  Status,
  type ToolProps,
  useQuery,
} from '../ui'

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    gender: 'Пол',
    genders: [
      ['female', 'женщина'],
      ['male', 'мужчина'],
    ] as const,
    birth: 'Дата рождения',
    early: 'Основание',
    earlies: [
      ['none', 'общий пенсионный возраст'],
      ['mother5', 'мать 5 и более детей (53 года)'],
      ['semipalatinsk', 'зона Семипалатинского полигона'],
    ] as const,
    record1998: 'Трудовой стаж до 1998 года, лет',
    income: 'Средний доход за лучшие 3 года подряд с 1998, ₸',
    record: 'Стаж участия в пенсионной системе к пенсии, лет',
    recordHint: 'стаж до 1998 + годы с пенсионными взносами',
    enpf: 'Взносы в ЕНПФ до пенсии',
    salary: 'Зарплата сейчас, ₸',
    employee: 'Работаю по найму — работодатель платит ОПВР',
    savings: 'Уже на счёте в ЕНПФ, ₸',
    savingsHint: 'пусто — не учитывать',
    total: 'От государства в месяц',
    retire: (age: number) => `Пенсия с ${String(age).replace('.', ',')} лет`,
    basic: (p: number) => `Базовая пенсия (${p} % прожиточного минимума)`,
    basicFrom: (age: number, date: string) =>
      `Базовая пенсия — только с ${String(age).replace('.', ',')} лет, с ${date} (Социальный кодекс, ст. 205): при досрочном выходе до этого платится одна солидарная.`,
    solidary: (p: number, ratio: number) =>
      ratio === 1
        ? `Солидарная пенсия (${p} % дохода)`
        : `Солидарная пенсия (${p} % дохода × ${fmt(ratio * 100, 0)} % за неполный стаж)`,
    noSolidary: 'Солидарная пенсия — стаж до 1998 года меньше 6 месяцев',
    capped: (cap: string) => `Доход учитывается не больше 55 МРП — ${cap}.`,
    months: 'Месяцев взносов',
    opv: 'ОПВ, 10 % зарплаты',
    opvr: 'ОПВР работодателя',
    sum: 'Накопится без инвестдохода',
    reached: 'Пенсионный возраст уже наступил — взносы до пенсии не считаются.',
    note: 'Суммы — в ценах 2026 года. Выплаты из ЕНПФ (ОПВ и ОПВР) не считаются: их размер задают методика Правительства и правила уполномоченного органа, а доходность фонда законом не установлена.',
    messages: ru.pension,
  },
  kk: {
    gender: 'Жынысы',
    genders: [
      ['female', 'әйел'],
      ['male', 'ер'],
    ] as const,
    birth: 'Туған күні',
    early: 'Негіз',
    earlies: [
      ['none', 'жалпы зейнет жасы'],
      ['mother5', '5 және одан көп баланың анасы (53 жас)'],
      ['semipalatinsk', 'Семей полигоны аймағы'],
    ] as const,
    record1998: '1998 жылға дейінгі еңбек өтілі, жыл',
    income: '1998 жылдан бергі қатарынан ең жақсы 3 жылдағы орташа табыс, ₸',
    record: 'Зейнетке шыққанға дейінгі зейнетақы жүйесіне қатысу өтілі, жыл',
    recordHint: '1998-ге дейінгі өтіл + жарна төленген жылдар',
    enpf: 'Зейнетке шыққанға дейін БЖЗҚ-ға жарналар',
    salary: 'Қазіргі жалақы, ₸',
    employee: 'Жалдамалы жұмыс — жұмыс беруші МЗЖЖ төлейді',
    savings: 'БЖЗҚ шотында бар, ₸',
    savingsHint: 'бос — ескермеу',
    total: 'Мемлекеттен айына',
    retire: (age: number) => `${String(age).replace('.', ',')} жастан зейнетақы`,
    basic: (p: number) => `Базалық зейнетақы (ең төменгі күнкөріс деңгейінің ${p} %-ы)`,
    basicFrom: (age: number, date: string) =>
      `Базалық зейнетақы — тек ${String(age).replace('.', ',')} жастан, ${date} бастап (Әлеуметтік кодекс, 205-бап): мерзімінен бұрын шыққанда оған дейін тек ортақ зейнетақы төленеді.`,
    solidary: (p: number, ratio: number) =>
      ratio === 1
        ? `Ортақ зейнетақы (табыстың ${p} %-ы)`
        : `Ортақ зейнетақы (табыстың ${p} %-ы × толық емес өтіл үшін ${fmt(ratio * 100, 0)} %)`,
    noSolidary: 'Ортақ зейнетақы — 1998 жылға дейінгі өтіл 6 айдан аз',
    capped: (cap: string) => `Табыс 55 АЕК-тен аспай ескеріледі — ${cap}.`,
    months: 'Жарна айлары',
    opv: 'МЗЖ, жалақының 10 %-ы',
    opvr: 'Жұмыс берушінің МЗЖЖ',
    sum: 'Инвестициялық табыссыз жиналады',
    reached: 'Зейнет жасы басталып қойған — зейнетке дейінгі жарналар есептелмейді.',
    note: 'Сомалар 2026 жылғы бағамен. БЖЗҚ-дан төлемдер (МЗЖ және МЗЖЖ) есептелмейді: олардың мөлшерін Үкіметтің әдістемесі мен уәкілетті органның қағидалары белгілейді, ал қордың табыстылығы заңмен белгіленбеген.',
    messages: kk.pension,
  },
}

export default function Pension({ lang }: ToolProps) {
  const t = T[lang]
  const [genderQ, setGender] = useQuery('g', 'female')
  const gender = genderQ === 'male' ? 'male' : 'female'
  const [birth, setBirth] = useQuery('b', '1970-05-01')
  const [earlyQ, setEarly] = useQuery('early', 'none')
  const early = t.earlies.some(([k]) => k === earlyQ)
    ? (earlyQ as (typeof t.earlies)[number][0])
    : 'none'
  const [record1998, setRecord1998] = useQuery('s98', '8')
  const [income, setIncome] = useQuery('inc', '300000')
  const [record, setRecord] = useQuery('st', '35')
  const [salary, setSalary] = useQuery('sal', '400000')
  const [employee, setEmployee] = useQuery('emp', '1')
  const [savings, setSavings] = useQuery('sav', '')
  // Contributions run from today; today is known only after hydration.
  const [today, setToday] = useState('')
  useEffect(() => {
    const d = new Date()
    setToday(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    )
  }, [])

  const age = retirementAge(
    birth,
    gender,
    early === 'none' ? undefined : (early as EarlyRetirement),
  )
  const basic = basicPension(num(record || '0'))
  // Basic pension starts at the general age of art. 207 p. 1 even when the solidary one starts early.
  const general = early === 'none' ? age : retirementAge(birth, gender)
  const later = early !== 'none' && general.ok && age.ok && general.value.date > age.value.date
  const solidary = agePension(income || 0, num(record1998 || '0'), gender)
  const enpf =
    age.ok && today && salary.trim()
      ? pensionContributions(salary, today, age.value.date, {
          employee: employee === '1',
          ...(savings.trim() ? { savings } : {}),
        })
      : undefined
  const r = !age.ok
    ? age
    : !basic.ok
      ? basic
      : !solidary.ok
        ? solidary
        : enpf && !enpf.ok
          ? enpf
          : undefined

  return (
    <>
      <div className="grid">
        <Choice label={t.gender} value={gender} options={t.genders} onChange={setGender} />
        <Field label={t.birth} value={birth} onChange={setBirth} type="date" />
        <Choice label={t.early} value={early} options={t.earlies} onChange={setEarly} />
        <Field
          label={t.record1998}
          value={record1998}
          onChange={setRecord1998}
          inputMode="decimal"
        />
        <Field label={t.income} value={income} onChange={setIncome} inputMode="decimal" />
        <Field
          label={t.record}
          value={record}
          onChange={setRecord}
          placeholder={t.recordHint}
          inputMode="decimal"
        />
      </div>
      <details className="more" open>
        <summary>{t.enpf}</summary>
        <div className="grid">
          <Field label={t.salary} value={salary} onChange={setSalary} inputMode="decimal" />
          <Field
            label={t.savings}
            value={savings}
            onChange={setSavings}
            placeholder={t.savingsHint}
            inputMode="decimal"
          />
        </div>
        <Check
          label={t.employee}
          checked={employee === '1'}
          onChange={(v) => setEmployee(v ? '1' : '0')}
        />
      </details>
      {r && !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : age.ok && basic.ok && solidary.ok ? (
        <>
          <div className="result">
            <div>
              <small>{t.total}</small>
              <b>{fmt((later ? 0 : basic.value.amount) + solidary.value.amount)} ₸</b>
            </div>
            <div>
              <small>{t.retire(age.value.age)}</small>
              <b>{dmy(age.value.date)}</b>
            </div>
          </div>
          <Rows
            lang={lang}
            rows={[
              [t.basic(basic.value.percent), `${fmt(basic.value.amount)} ₸`],
              solidary.value.ratio
                ? [
                    t.solidary(solidary.value.percent, solidary.value.ratio),
                    `${fmt(solidary.value.amount)} ₸`,
                  ]
                : [t.noSolidary, '0 ₸'],
            ]}
          />
          {later && general.ok && (
            <Status>{t.basicFrom(general.value.age, dmy(general.value.date))}</Status>
          )}
          {solidary.value.ratio > 0 && num(income || '0') > solidary.value.income && (
            <Status>{t.capped(`${fmt(solidary.value.income)} ₸`)}</Status>
          )}
          {enpf?.ok &&
            (enpf.value.months ? (
              <Rows
                lang={lang}
                rows={[
                  [t.months, String(enpf.value.months)],
                  [t.opv, `${fmt(enpf.value.opv)} ₸`],
                  ...(employee === '1'
                    ? ([[t.opvr, `${fmt(enpf.value.opvr)} ₸`]] as [string, string][])
                    : []),
                  [t.sum, `${fmt(enpf.value.total)} ₸`],
                ]}
              />
            ) : (
              <Status>{t.reached}</Status>
            ))}
          <p className="note">{t.note}</p>
          <div className="bar">
            <Share lang={lang} />
          </div>
        </>
      ) : null}
    </>
  )
}
