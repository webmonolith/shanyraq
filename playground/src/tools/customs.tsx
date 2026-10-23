import { useEffect, useState } from 'react'
import { personalCarDuty } from 'shanyraq/customs'
import { kk, ru } from 'shanyraq/i18n'
import { getTaxYear } from 'shanyraq/tax'
import { recyclingFee, registrationFee } from 'shanyraq/vehicle'
import customs from '../../../data/customs.json'
import fees from '../../../data/fees.json'
import { Choice, dmy, Field, fmt, num, Rows, Share, Status, type ToolProps, useQuery } from '../ui'

const money = (n: number) => `${fmt(n, 2)} ₸`
const comma = (n: number) => String(n).replace('.', ',')
const fee = (ru: string) => fees.items.find((i) => i.ru === ru)?.mrp ?? 0
const CERTIFICATE = fee('Свидетельство о регистрации транспортного средства')
const PLATES = fee('Госномер на автомобиль (обычный)')
const EUR = customs.eurExample

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    engine: 'Двигатель',
    engines: [
      ['ice', 'бензин, дизель, гибрид'],
      ['electric', 'только электродвигатель'],
    ] as const,
    value: 'Стоимость, евро',
    valueHint: 'нужна для машин до 3 лет',
    volume: 'Объём двигателя, куб. см',
    made: 'Месяц и год выпуска',
    declared: 'Дата подачи ПТД',
    eur: 'Курс евро, ₸',
    eurHint: `${comma(EUR.rate)} — курс НБРК на ${dmy(EUR.date)}`,
    total: 'Всего до постановки на учёт',
    duty: 'Единый платёж на таможне',
    groups: {
      upTo3: (age: number) => `${age} г. — до 3 лет`,
      upTo5: (age: number) => `${age} г. — от 3 до 5 лет`,
      over5: (age: number) => `${age} г. — старше 5 лет`,
    },
    age: 'Возраст',
    byValue: (p: number) => `${p} % стоимости`,
    byVolume: (c: number) => `${comma(c)} € × объём`,
    euro: 'Платёж в евро',
    recycling: (k: number) => `Утильсбор (50 МРП × ${comma(k)})`,
    registration: (age: number, rate: number) =>
      `Сбор за первичную регистрацию (${age}-й год, ${comma(rate)} МРП)`,
    certificate: `Свидетельство о регистрации (${comma(CERTIFICATE)} МРП)`,
    plates: `Госномер (${comma(PLATES)} МРП)`,
    old: 'С 26.09.2026 электронный паспорт на машину, ввезённую физлицом для себя, оформляют, только если с выпуска прошло не больше 5 лет. Без него машину не поставить на учёт.',
    electric:
      'Для электромобилей единой ставки нет: пошлину и НДС считают по общим ставкам как совокупный таможенный платёж (решение № 107, табл. 2 п. 4).',
    note: 'Единый платёж заменяет пошлину, НДС и акциз. Утильсбор, регистрация и номера — по МРП 2026 года. Таможенный сбор и услуги брокера, СБКТС и лаборатории не входят.',
    hint: 'Введите стоимость, объём и даты.',
    messages: ru.customs,
  },
  kk: {
    engine: 'Қозғалтқыш',
    engines: [
      ['ice', 'бензин, дизель, гибрид'],
      ['electric', 'тек электр қозғалтқышы'],
    ] as const,
    value: 'Құны, еуро',
    valueHint: '3 жасқа дейінгі көлікке керек',
    volume: 'Қозғалтқыш көлемі, текше см',
    made: 'Шығарылған айы мен жылы',
    declared: 'ЖКД берілген күні',
    eur: 'Еуро бағамы, ₸',
    eurHint: `${comma(EUR.rate)} — ҰБ бағамы, ${dmy(EUR.date)}`,
    total: 'Есепке қойғанға дейін барлығы',
    duty: 'Кедендегі бірыңғай төлем',
    groups: {
      upTo3: (age: number) => `${age} жыл — 3 жасқа дейін`,
      upTo5: (age: number) => `${age} жыл — 3-тен 5 жасқа дейін`,
      over5: (age: number) => `${age} жыл — 5 жастан асқан`,
    },
    age: 'Жасы',
    byValue: (p: number) => `құнының ${p} %-ы`,
    byVolume: (c: number) => `${comma(c)} € × көлем`,
    euro: 'Еуромен төлем',
    recycling: (k: number) => `Кәдеге жарату алымы (50 АЕК × ${comma(k)})`,
    registration: (age: number, rate: number) =>
      `Алғашқы тіркеу алымы (${age}-жыл, ${comma(rate)} АЕК)`,
    certificate: `Тіркеу туралы куәлік (${comma(CERTIFICATE)} АЕК)`,
    plates: `Мемлекеттік нөмір (${comma(PLATES)} АЕК)`,
    old: '2026 жылғы 26 қыркүйектен бастап жеке тұлға өзі үшін әкелген көлікке электрондық паспорт шығарылғаннан бері 5 жылдан аспаса ғана ресімделеді. Онсыз көлікті есепке қою мүмкін емес.',
    electric:
      'Электромобильдерге бірыңғай мөлшерлеме жоқ: баж бен ҚҚС жалпы мөлшерлемелер бойынша жиынтық кедендік төлем ретінде есептеледі (№ 107 шешім, 2-кесте 4-т.).',
    note: 'Бірыңғай төлем баждың, ҚҚС пен акциздің орнына төленеді. Кәдеге жарату алымы, тіркеу және нөмірлер — 2026 жылғы АЕК бойынша. Кедендік алым, брокер, СБКТС және зертхана қызметтері кірмейді.',
    hint: 'Құнын, көлемін және күндерді енгізіңіз.',
    messages: kk.customs,
  },
}

export default function Customs({ lang }: ToolProps) {
  const t = T[lang]
  const [engineQ, setEngine] = useQuery('e', 'ice')
  const engine = engineQ === 'electric' ? 'electric' : 'ice'
  const [value, setValue] = useQuery('q', '20000')
  const [volume, setVolume] = useQuery('v', '1998')
  const [made, setMade] = useQuery('made', '2024-05')
  const [declaredQ, setDeclared] = useQuery('d', '')
  const [eur, setEur] = useQuery('eur', String(EUR.rate))
  // The declaration day defaults to today, known only after hydration.
  const [today, setToday] = useState('')
  useEffect(() => {
    const d = new Date()
    setToday(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    )
  }, [])
  const declared = declaredQ || today

  const madeDay = /^\d{4}-\d{2}$/.test(made) ? `${made}-01` : made
  const r =
    engine === 'ice' && declared
      ? personalCarDuty(value.trim() || 0, { volume, made: madeDay, declared, eur })
      : undefined
  const year = Number(declared.slice(0, 4))
  const reg = r?.ok ? registrationFee('car', Number(made.slice(0, 4)), { year }) : undefined
  const recycle = r?.ok ? recyclingFee('car', { volume: num(volume) }) : undefined
  const y = getTaxYear()
  const extras = y ? (CERTIFICATE + PLATES) * y.mrp : 0
  const total =
    r?.ok && reg?.ok && recycle?.ok ? r.value.duty + reg.value.fee + recycle.value.fee + extras : 0

  return (
    <>
      <div className="grid">
        <Choice label={t.engine} value={engine} options={t.engines} onChange={setEngine} />
        {engine === 'ice' && (
          <>
            <Field
              label={t.value}
              value={value}
              onChange={setValue}
              placeholder={t.valueHint}
              inputMode="decimal"
            />
            <Field label={t.volume} value={volume} onChange={setVolume} inputMode="numeric" />
            <Field label={t.made} value={made} onChange={setMade} type="month" />
            <Field label={t.declared} value={declared} onChange={setDeclared} type="date" />
            <Field
              label={t.eur}
              value={eur}
              onChange={setEur}
              placeholder={t.eurHint}
              inputMode="decimal"
            />
          </>
        )}
      </div>
      {engine === 'electric' ? (
        <Status>{t.electric}</Status>
      ) : !r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          <div className="result">
            <div>
              <small>{total ? t.total : t.duty}</small>
              <b>{money(total || r.value.duty)}</b>
            </div>
            <div>
              <small>{t.age}</small>
              <b>{t.groups[r.value.group](r.value.age)}</b>
            </div>
          </div>
          {r.value.group === 'over5' && <Status ok={false}>{t.old}</Status>}
          <Rows
            lang={lang}
            rows={[
              ...(r.value.byValue !== undefined
                ? ([[t.byValue(r.value.percent as number), `${fmt(r.value.byValue, 2)} €`]] as [
                    string,
                    string,
                  ][])
                : []),
              [t.byVolume(r.value.perCc), `${fmt(r.value.byVolume, 2)} €`],
              [t.euro, `${fmt(r.value.euro, 2)} €`],
              [t.duty, money(r.value.duty)],
              ...(recycle?.ok
                ? ([[t.recycling(recycle.value.coefficient), money(recycle.value.fee)]] as [
                    string,
                    string,
                  ][])
                : []),
              ...(reg?.ok
                ? ([
                    [t.registration(reg.value.age, reg.value.rate), money(reg.value.fee)],
                    [t.certificate, money(CERTIFICATE * (y?.mrp ?? 0))],
                    [t.plates, money(PLATES * (y?.mrp ?? 0))],
                  ] as [string, string][])
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
