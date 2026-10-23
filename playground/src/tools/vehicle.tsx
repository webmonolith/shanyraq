import { kk, ru } from 'shanyraq/i18n'
import { getTaxYear } from 'shanyraq/tax'
import {
  type RecyclingKind,
  type RegistrationKind,
  recyclingFee,
  registrationFee,
  type VehicleKind,
  vehicleTax,
} from 'shanyraq/vehicle'
import fees from '../../../data/fees.json'
import { Choice, Field, fmt, Rows, Share, Status, type ToolProps, useQuery } from '../ui'

const money = (n: number) => `${fmt(n, 2)} ₸`
const num = (s: string) => Number(s.replace(/[\s ]/g, '').replace(',', '.'))
const mrp = (n: number) => String(n).replace('.', ',')
const fee = (ru: string) => fees.items.find((i) => i.ru === ru)?.mrp ?? 0
// Certificate and plates from data/fees.json (Tax Code art. 667 p. 3 subp. 7).
const CERTIFICATE = fee('Свидетельство о регистрации транспортного средства')
const PLATES = fee('Госномер на автомобиль (обычный)')

const TAX_KINDS: VehicleKind[] = ['car', 'truck', 'bus', 'moto', 'special']
type RegKind = 'car' | 'electric' | 'truck' | 'bus'
const REG_KINDS: RegKind[] = ['car', 'electric', 'truck', 'bus']
const REG: Record<RegKind, [RegistrationKind, RecyclingKind]> = {
  car: ['car', 'car'],
  electric: ['electric', 'car'],
  truck: ['truck', 'truck'],
  bus: ['truck', 'bus'],
}

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    mode: 'Расчёт',
    modes: [
      ['tax', 'налог на транспорт за год'],
      ['register', 'постановка на учёт: регистрация и утильсбор'],
    ] as const,
    kind: 'Транспорт',
    taxKinds: [
      ['car', 'легковой автомобиль'],
      ['truck', 'грузовой автомобиль'],
      ['bus', 'автобус'],
      ['moto', 'мотоцикл, мотороллер'],
      ['special', 'трактор, спецтехника'],
    ] as const,
    regKinds: [
      ['car', 'легковой автомобиль'],
      ['electric', 'электромобиль (не гибрид)'],
      ['truck', 'грузовой (N1–N3)'],
      ['bus', 'автобус (M2, M3)'],
    ] as const,
    value: {
      car: 'Объём двигателя, куб. см',
      truck: 'Грузоподъёмность, т',
      bus: 'Посадочных мест',
      moto: 'Мощность, кВт',
      special: '',
    },
    mass: 'Полная масса, т',
    made: 'Год выпуска',
    months: 'Месяцев владения в году',
    origin: 'Откуда ввезён',
    origins: [
      ['other', 'произведён в РК или из других стран'],
      ['ruby', 'из России или Беларуси'],
    ] as const,
    tax: 'Налог за год',
    taxPart: (m: number) => `Налог за ${m} мес.`,
    rate: 'Ставка',
    extra: 'Надбавка 7 ₸ за куб. см',
    coefficient: 'Коэффициент по возрасту',
    total: 'Всего при постановке на учёт',
    registration: (age: number, rate: number) =>
      `Сбор за первичную регистрацию (${age}-й год, ${mrp(rate)} МРП)`,
    recycling: (k: number) => `Утильсбор (50 МРП × ${mrp(k)})`,
    certificate: `Свидетельство о регистрации (${mrp(CERTIFICATE)} МРП)`,
    plates: `Госномер (${mrp(PLATES)} МРП)`,
    noteTax:
      'Платится до 1 апреля следующего года по месту жительства (НК, ст. 567). МРП — на 1 января налогового года.',
    noteRegister:
      'Утильсбор платится один раз до первичной регистрации; сбор за регистрацию и пошлины — по МРП на дату оплаты. Таможенная пошлина, НДС и акциз при ввозе не входят.',
    hint: 'Введите данные транспорта.',
    messages: ru.vehicle,
  },
  kk: {
    mode: 'Есеп',
    modes: [
      ['tax', 'жылдық көлік салығы'],
      ['register', 'есепке қою: тіркеу және кәдеге жарату алымы'],
    ] as const,
    kind: 'Көлік',
    taxKinds: [
      ['car', 'жеңіл автокөлік'],
      ['truck', 'жүк автокөлігі'],
      ['bus', 'автобус'],
      ['moto', 'мотоцикл, мотороллер'],
      ['special', 'трактор, арнайы техника'],
    ] as const,
    regKinds: [
      ['car', 'жеңіл автокөлік'],
      ['electric', 'электромобиль (гибрид емес)'],
      ['truck', 'жүк көлігі (N1–N3)'],
      ['bus', 'автобус (M2, M3)'],
    ] as const,
    value: {
      car: 'Қозғалтқыш көлемі, текше см',
      truck: 'Жүк көтергіштігі, т',
      bus: 'Отыратын орындар',
      moto: 'Қуаты, кВт',
      special: '',
    },
    mass: 'Толық массасы, т',
    made: 'Шығарылған жылы',
    months: 'Жылдағы иелену айлары',
    origin: 'Қайдан әкелінген',
    origins: [
      ['other', 'ҚР-да шығарылған немесе басқа елдерден'],
      ['ruby', 'Ресейден немесе Беларусьтен'],
    ] as const,
    tax: 'Жылдық салық',
    taxPart: (m: number) => `${m} айға салық`,
    rate: 'Мөлшерлеме',
    extra: 'Әр текше см үшін 7 ₸ үстеме',
    coefficient: 'Жасы бойынша коэффициент',
    total: 'Есепке қойғанда барлығы',
    registration: (age: number, rate: number) =>
      `Алғашқы тіркеу алымы (${age}-жыл, ${mrp(rate)} АЕК)`,
    recycling: (k: number) => `Кәдеге жарату алымы (50 АЕК × ${mrp(k)})`,
    certificate: `Тіркеу туралы куәлік (${mrp(CERTIFICATE)} АЕК)`,
    plates: `Мемлекеттік нөмір (${mrp(PLATES)} АЕК)`,
    noteTax:
      'Келесі жылдың 1 сәуіріне дейін тұрғылықты жер бойынша төленеді (СК, 567-бап). АЕК — салық жылының 1 қаңтарындағы.',
    noteRegister:
      'Кәдеге жарату алымы алғашқы тіркеуге дейін бір рет төленеді; тіркеу алымы мен баждар — төлеген күнгі АЕК бойынша. Әкелу кезіндегі кедендік баж, ҚҚС және акциз кірмейді.',
    hint: 'Көлік деректерін енгізіңіз.',
    messages: kk.vehicle,
  },
}

export default function Vehicle({ lang }: ToolProps) {
  const t = T[lang]
  const [modeQ, setMode] = useQuery('mode', 'tax')
  const mode = modeQ === 'register' ? 'register' : 'tax'
  const [kindQ, setKind] = useQuery('kind', 'car')
  const taxKind = (TAX_KINDS as string[]).includes(kindQ) ? (kindQ as VehicleKind) : 'car'
  const regKind = (REG_KINDS as string[]).includes(kindQ) ? (kindQ as RegKind) : 'car'
  const [value, setValue] = useQuery('v', '2000')
  const [made, setMade] = useQuery('made', '2018')
  const [months, setMonths] = useQuery('m', '12')
  const [originQ, setOrigin] = useQuery('from', 'other')
  const origin = originQ === 'ruby' ? 'ruby' : 'other'

  const year = num(made)
  const n = num(value)
  const tax =
    mode === 'tax'
      ? vehicleTax(taxKind, {
          volume: n,
          tonnage: n,
          seats: n,
          kw: n,
          months: num(months),
          ...(taxKind === 'car' && made.trim() ? { made: year } : {}),
        })
      : undefined
  const [regAs, recycleAs] = REG[regKind]
  const reg = mode === 'register' ? registrationFee(regAs, year) : undefined
  const recycle =
    mode === 'register'
      ? recyclingFee(recycleAs, {
          volume: n,
          mass: n,
          electric: regKind === 'electric',
          fromRuBy: origin === 'ruby',
        })
      : undefined
  const r = tax ?? (reg?.ok ? recycle : reg)
  const y = getTaxYear()
  const extras = y ? (CERTIFICATE + PLATES) * y.mrp : 0

  return (
    <>
      <div className="grid">
        <Choice label={t.mode} value={mode} options={t.modes} onChange={setMode} />
        {mode === 'tax' ? (
          <Choice label={t.kind} value={taxKind} options={t.taxKinds} onChange={setKind} />
        ) : (
          <Choice label={t.kind} value={regKind} options={t.regKinds} onChange={setKind} />
        )}
        {mode === 'tax' && taxKind !== 'special' && (
          <Field label={t.value[taxKind]} value={value} onChange={setValue} inputMode="decimal" />
        )}
        {mode === 'register' && regKind !== 'electric' && (
          <Field
            label={regKind === 'truck' ? t.mass : t.value.car}
            value={value}
            onChange={setValue}
            inputMode="decimal"
          />
        )}
        {(mode === 'register' || taxKind === 'car') && (
          <Field label={t.made} value={made} onChange={setMade} inputMode="numeric" />
        )}
        {mode === 'tax' ? (
          <Field label={t.months} value={months} onChange={setMonths} inputMode="numeric" />
        ) : (
          <Choice label={t.origin} value={origin} options={t.origins} onChange={setOrigin} />
        )}
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          {tax?.ok && (
            <>
              <div className="result">
                <div>
                  <small>
                    {tax.value.tax === tax.value.annual ? t.tax : t.taxPart(num(months))}
                  </small>
                  <b>{money(tax.value.tax)}</b>
                </div>
              </div>
              <Rows
                lang={lang}
                rows={[
                  [t.rate, `${mrp(tax.value.rate)} × ${fmt(tax.value.mrp)} ₸`],
                  ...(tax.value.extra
                    ? ([[t.extra, money(tax.value.extra)]] as [string, string][])
                    : []),
                  ...(tax.value.coefficient !== 1
                    ? ([[t.coefficient, mrp(tax.value.coefficient)]] as [string, string][])
                    : []),
                  ...(tax.value.tax !== tax.value.annual
                    ? ([[t.tax, money(tax.value.annual)]] as [string, string][])
                    : []),
                ]}
              />
              <p className="note">{t.noteTax}</p>
            </>
          )}
          {reg?.ok && recycle?.ok && (
            <>
              <div className="result">
                <div>
                  <small>{t.total}</small>
                  <b>{money(reg.value.fee + recycle.value.fee + extras)}</b>
                </div>
              </div>
              <Rows
                lang={lang}
                rows={[
                  [t.registration(reg.value.age, reg.value.rate), money(reg.value.fee)],
                  [t.recycling(recycle.value.coefficient), money(recycle.value.fee)],
                  [t.certificate, money(CERTIFICATE * (y?.mrp ?? 0))],
                  [t.plates, money(PLATES * (y?.mrp ?? 0))],
                ]}
              />
              <p className="note">{t.noteRegister}</p>
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
