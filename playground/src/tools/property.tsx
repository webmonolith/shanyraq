import { kk, ru } from 'shanyraq/i18n'
import {
  type Heating,
  type LandKind,
  landTax,
  type PropertyKind,
  propertyTax,
  propertyValue,
  type Settlement,
  type WallMaterial,
} from 'shanyraq/property'
import { functional, settlements } from '../../../data/property.json'
import {
  Check,
  Choice,
  Field,
  fmt,
  num,
  Rows,
  Share,
  Status,
  type ToolProps,
  useQuery,
} from '../ui'

const money = (n: number) => `${fmt(n, 2)} ₸`
const k = (n: number) => String(n).replace('.', ',')

type Mode = 'estimate' | 'value' | 'land'
const MODES: Mode[] = ['estimate', 'value']
const KINDS: PropertyKind[] = ['dwelling', 'storage', 'garage']
const LAND_KINDS: LandKind[] = ['housing', 'yard', 'garden']
const FLOORS = ['middle', 'first', 'last'] as const
const HEATING: Heating[] = ['central', 'gas', 'solid', 'stove']
const GROUPS = ['1', '2', '3', '4', '5', '6'] as const

const pick = <T extends string>(list: readonly T[], v: string): T =>
  (list as readonly string[]).includes(v) ? (v as T) : (list[0] as T)

const WALLS_KK: Record<string, string> = {
  brick: 'Кірпіштен',
  claydite: 'Керамзитбетон блоктардан құрастырылған',
  clayditeBrick: 'Кірпішпен қапталған керамзитбетон блоктар',
  panel: 'Темірбетон панельдер',
  panelBrick: 'Кірпішпен қапталған темірбетон панельдер',
  adobe: 'Саман-балшық',
  adobeBrick: 'Сырты 0,5 кірпішпен қапталған саман',
  slag: 'Монолитті шлакбетон',
  concreteBlock: 'Темірбетон блоктардан',
  frame: 'Құрастырмалы-қалқанды',
  frameBrick: '0,5 кірпішпен қапталған құрастырмалы-қалқанды',
  log: 'Ағаштан қиылған',
  sleeper: 'Шпалды',
  sleeperBrick: 'Кірпішпен қапталған шпалды',
  reed: 'Қаңқалы-қамысты',
  other: 'Басқа',
}

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    mode: 'Расчёт',
    modes: [
      ['estimate', 'по параметрам жилья'],
      ['value', 'по стоимости из уведомления'],
    ] as const,
    settlement: 'Населённый пункт',
    kind: 'Объект',
    kinds: [
      ['dwelling', 'квартира, дом, дача'],
      ['storage', 'кладовка, подвал, пристройка'],
      ['garage', 'гараж, парковочное место'],
    ] as const,
    area: 'Площадь, м²',
    built: 'Год ввода в эксплуатацию',
    walls: 'Материал стен',
    more: 'Износ и поправочные коэффициенты',
    group: 'Группа капитальности',
    groups: [
      ['1', '1 — каменные, крупнопанельные (0,7 % в год)'],
      ['2', '2 — кирпич 1,5–2,5 кирпича, крупноблочные (0,8 %)'],
      ['3', '3 — облегчённый кирпич, шлакобетон (1 %)'],
      ['4', '4 — деревянные, смешанные (2 %)'],
      ['5', '5 — саманные, сборно-щитовые (3,3 %)'],
      ['6', '6 — каркасно-камышитовые (6,6 %)'],
    ] as const,
    floor: 'Этаж',
    floors: [
      ['middle', 'средний, частный дом или дом до 3 этажей'],
      ['first', 'первый'],
      ['last', 'последний'],
    ] as const,
    corner: 'Угловая квартира',
    noAmenities: 'Нет водопровода, канализации и других удобств',
    heating: 'Отопление',
    heatings: [
      ['central', 'центральное'],
      ['gas', 'местное на газе или мазуте'],
      ['solid', 'местное водяное на твёрдом топливе'],
      ['stove', 'печное'],
    ] as const,
    zone: 'Коэффициент зонирования (решение акимата)',
    luxury: 'Коэффициент роскоши, 1–1,5 (решение маслихата)',
    mrpIndex: 'Коэффициент изменения МРП',
    value: 'Стоимость для налога, ₸',
    share: 'Доля в собственности, %',
    months: 'Месяцев владения в году',
    landKind: 'Участок',
    landKinds: [
      ['housing', 'под жильём (кроме придомового)'],
      ['yard', 'придомовой'],
      ['garden', 'ЛПХ, сад, дача'],
    ] as const,
    adjust: 'Поправка маслихата, % (−50…50)',
    reduced: 'Маслихат снизил ставку сверх порога до 0,20 ₸',
    estimated: 'Стоимость для налога',
    tax: 'Налог за год',
    taxPart: (m: number) => `Налог за ${m} мес.`,
    rows: {
      base: 'Базовая стоимость 1 м²',
      wear: 'Физический износ',
      physical: 'Кфиз',
      functional: 'Кфункц',
      zone: 'Кзон',
      mrp: 'Кизм.мрп',
      luxury: 'Кроск',
      annual: 'Налог за полный год',
      aggregate: 'Стоимость больше 450 млн ₸: налог по совокупной стоимости (ст. 604)',
    },
    noteEstimate:
      'Оценка по формуле ст. 600 НК: в уведомлении стоимость считает Госкорпорация по данным кадастра, и коэффициент зонирования у каждого квартала свой. Налог уплачивается до 1 октября следующего года.',
    noteValue:
      'Стоимость для налога указана в налоговом уведомлении. Налог уплачивается до 1 октября следующего года.',
    noteLand:
      'Ставки по ст. 602 НК. Квартира в многоквартирном доме налогом на землю не облагается (ст. 597 п. 2 подп. 7).',
    hint: 'Введите площадь и год.',
    messages: ru.property,
  },
  kk: {
    mode: 'Есеп',
    modes: [
      ['estimate', 'тұрғын үй параметрлері бойынша'],
      ['value', 'хабарламадағы құны бойынша'],
    ] as const,
    settlement: 'Елді мекен',
    kind: 'Объект',
    kinds: [
      ['dwelling', 'пәтер, үй, саяжай'],
      ['storage', 'қойма, жертөле, жапсаржай'],
      ['garage', 'гараж, тұрақ орны'],
    ] as const,
    area: 'Аудан, м²',
    built: 'Пайдалануға берілген жылы',
    walls: 'Қабырға материалы',
    more: 'Тозу және түзету коэффициенттері',
    group: 'Күрделілік тобы',
    groups: [
      ['1', '1 — тас, ірі панельді (жылына 0,7 %)'],
      ['2', '2 — 1,5–2,5 кірпіш, ірі блокты (0,8 %)'],
      ['3', '3 — жеңілдетілген кірпіш, шлакбетон (1 %)'],
      ['4', '4 — ағаш, аралас (2 %)'],
      ['5', '5 — саман, құрастырмалы-қалқанды (3,3 %)'],
      ['6', '6 — қаңқалы-қамысты (6,6 %)'],
    ] as const,
    floor: 'Қабат',
    floors: [
      ['middle', 'орта, жеке үй немесе 3 қабатқа дейінгі үй'],
      ['first', 'бірінші'],
      ['last', 'соңғы'],
    ] as const,
    corner: 'Бұрыштағы пәтер',
    noAmenities: 'Су құбыры, кәріз және басқа жайлылықтар жоқ',
    heating: 'Жылыту',
    heatings: [
      ['central', 'орталық'],
      ['gas', 'газбен немесе мазутпен жергілікті'],
      ['solid', 'қатты отынмен жергілікті сулы'],
      ['stove', 'пеш'],
    ] as const,
    zone: 'Аймақтарға бөлу коэффициенті (әкімдік шешімі)',
    luxury: 'Сәнділік коэффициенті, 1–1,5 (мәслихат шешімі)',
    mrpIndex: 'АЕК өзгеру коэффициенті',
    value: 'Салық үшін құны, ₸',
    share: 'Меншіктегі үлес, %',
    months: 'Жылдағы иелік ету айлары',
    landKind: 'Учаске',
    landKinds: [
      ['housing', 'тұрғын үй астындағы (үй жанындағыдан басқа)'],
      ['yard', 'үй жанындағы'],
      ['garden', 'ЖҚШ, бақ, саяжай'],
    ] as const,
    adjust: 'Мәслихат түзетуі, % (−50…50)',
    reduced: 'Мәслихат шектен асатын мөлшерлемені 0,20 ₸-ге дейін төмендеткен',
    estimated: 'Салық үшін құны',
    tax: 'Жылдық салық',
    taxPart: (m: number) => `${m} айға салық`,
    rows: {
      base: '1 м² базалық құны',
      wear: 'Физикалық тозу',
      physical: 'Кфиз',
      functional: 'Кфункц',
      zone: 'Каймақ',
      mrp: 'Каек.өзг',
      luxury: 'Ксән',
      annual: 'Толық жылға салық',
      aggregate: 'Құны 450 млн ₸-ден асады: салық жиынтық құн бойынша (604-бап)',
    },
    noteEstimate:
      'СК 600-бабының формуласы бойынша бағалау: хабарламадағы құнды Мемлекеттік корпорация кадастр деректері бойынша есептейді, аймақтарға бөлу коэффициенті әр орамда әртүрлі. Салық келесі жылдың 1 қазанына дейін төленеді.',
    noteValue:
      'Салық үшін құн салық хабарламасында көрсетілген. Салық келесі жылдың 1 қазанына дейін төленеді.',
    noteLand:
      'Мөлшерлемелер СК 602-бабы бойынша. Көппәтерлі үйдегі пәтерге жер салығы салынбайды (597-бап 2-т. 7) тармақша).',
    hint: 'Ауданы мен жылын енгізіңіз.',
    messages: kk.property,
  },
}

export function PropertyTool({ lang, land: isLand }: ToolProps & { land: boolean }) {
  const t = T[lang]
  const [modeQ, setMode] = useQuery('mode', 'estimate')
  const mode: Mode = isLand ? 'land' : pick(MODES, modeQ)
  const [sQ, setS] = useQuery('s', 'almaty')
  const s = pick(
    settlements.list.map((x) => x.id as Settlement),
    sQ,
  )
  const [kindQ, setKind] = useQuery('kind', 'dwelling')
  const kind = pick(KINDS, kindQ)
  const [area, setArea] = useQuery('a', '60')
  const [built, setBuilt] = useQuery('b', '2010')
  const [wQ, setW] = useQuery('w', 'panel')
  const walls = pick(
    functional.walls.map((x) => x.id as WallMaterial),
    wQ,
  )
  const [gQ, setG] = useQuery('g', '1')
  const group = pick(GROUPS, gQ)
  const [fQ, setF] = useQuery('f', 'middle')
  const floor = pick(FLOORS, fQ)
  const [cQ, setC] = useQuery('c', '')
  const [uQ, setU] = useQuery('u', '')
  const [hQ, setH] = useQuery('h', 'central')
  const heating = pick(HEATING, hQ)
  const [zone, setZone] = useQuery('z', '1')
  const [luxury, setLuxury] = useQuery('l', '1')
  const [mrpIndex, setMrpIndex] = useQuery('k', '')
  const [value, setValue] = useQuery('v', '25000000')
  const [share, setShare] = useQuery('sh', '100')
  const [months, setMonths] = useQuery('m', '12')
  const [lkQ, setLk] = useQuery('lk', 'yard')
  const landKind = pick(LAND_KINDS, lkQ)
  const [adjust, setAdjust] = useQuery('adj', '0')
  const [redQ, setRed] = useQuery('red', '')

  const owned = { share: num(share || 'x') / 100, months: num(months || 'x') }
  const est =
    mode === 'estimate' && area.trim() && built.trim()
      ? propertyValue({
          kind,
          settlement: s,
          area,
          built: num(built),
          group: Number(group),
          floor,
          corner: cQ === '1',
          walls,
          amenities: uQ !== '1',
          heating,
          zone: num(zone || 'x'),
          luxury: num(luxury || 'x'),
          ...(mrpIndex.trim() ? { mrpIndex: num(mrpIndex) } : {}),
        })
      : undefined
  const objectValue = mode === 'value' ? value : est?.ok ? est.value.value : undefined
  const tax =
    objectValue !== undefined && String(objectValue).trim()
      ? propertyTax({ value: objectValue, ...owned })
      : undefined
  const land =
    mode === 'land' && area.trim()
      ? landTax(landKind, area, {
          settlement: s,
          adjust: num(adjust || '0'),
          reduced: redQ === '1',
          ...owned,
        })
      : undefined
  const r = mode === 'land' ? land : est && !est.ok ? est : tax
  const m = num(months)
  const due =
    mode === 'land' ? (land?.ok ? land.value : undefined) : tax?.ok ? tax.value.items[0] : undefined
  const full: [string, string][] =
    due && due.tax !== due.annual ? [[t.rows.annual, money(due.annual)]] : []

  return (
    <>
      <div className="grid">
        {!isLand && <Choice label={t.mode} value={mode} options={t.modes} onChange={setMode} />}
        {mode === 'estimate' && (
          <Choice label={t.kind} value={kind} options={t.kinds} onChange={setKind} />
        )}
        {mode === 'land' && (
          <Choice label={t.landKind} value={landKind} options={t.landKinds} onChange={setLk} />
        )}
        {(mode === 'estimate' || (mode === 'land' && landKind !== 'garden')) && (
          <Choice
            label={t.settlement}
            value={s}
            options={settlements.list.map((x) => [x.id as Settlement, x[lang]] as const)}
            onChange={setS}
          />
        )}
        {mode === 'value' ? (
          <Field label={t.value} value={value} onChange={setValue} inputMode="decimal" />
        ) : (
          <Field label={t.area} value={area} onChange={setArea} inputMode="decimal" />
        )}
        {mode === 'estimate' && (
          <Field label={t.built} value={built} onChange={setBuilt} inputMode="numeric" />
        )}
        {mode === 'estimate' && kind === 'dwelling' && (
          <Choice
            label={t.walls}
            value={walls}
            options={functional.walls.map(
              (x) =>
                [x.id as WallMaterial, lang === 'ru' ? x.ru : (WALLS_KK[x.id] ?? x.ru)] as const,
            )}
            onChange={setW}
          />
        )}
        {mode === 'land' && landKind === 'housing' && (
          <Field label={t.adjust} value={adjust} onChange={setAdjust} inputMode="decimal" />
        )}
        <Field label={t.share} value={share} onChange={setShare} inputMode="decimal" />
        <Field label={t.months} value={months} onChange={setMonths} inputMode="numeric" />
        {mode === 'land' && landKind === 'yard' && (
          <Check label={t.reduced} checked={redQ === '1'} onChange={(v) => setRed(v ? '1' : '')} />
        )}
      </div>
      {mode === 'estimate' && (
        <details className="more">
          <summary>{t.more}</summary>
          <div className="grid">
            <Choice label={t.group} value={group} options={t.groups} onChange={setG} />
            {kind === 'dwelling' && (
              <>
                <Choice label={t.floor} value={floor} options={t.floors} onChange={setF} />
                <Choice label={t.heating} value={heating} options={t.heatings} onChange={setH} />
                <Field label={t.luxury} value={luxury} onChange={setLuxury} inputMode="decimal" />
              </>
            )}
            <Field label={t.zone} value={zone} onChange={setZone} inputMode="decimal" />
            <Field
              label={t.mrpIndex}
              value={mrpIndex}
              onChange={setMrpIndex}
              inputMode="decimal"
              placeholder="1,1"
            />
            {kind === 'dwelling' && (
              <>
                <Check label={t.corner} checked={cQ === '1'} onChange={(v) => setC(v ? '1' : '')} />
                <Check
                  label={t.noAmenities}
                  checked={uQ === '1'}
                  onChange={(v) => setU(v ? '1' : '')}
                />
              </>
            )}
          </div>
        </details>
      )}
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          <div className="result">
            {est?.ok && (
              <div>
                <small>{t.estimated}</small>
                <b>{money(est.value.value)}</b>
              </div>
            )}
            {due && (
              <div>
                <small>{m === 12 ? t.tax : t.taxPart(m)}</small>
                <b>{money(due.tax)}</b>
              </div>
            )}
          </div>
          {est?.ok && (
            <Rows
              lang={lang}
              rows={[
                [t.rows.base, money(est.value.base)],
                [t.rows.wear, `${k(est.value.wear)} %`],
                [t.rows.physical, k(est.value.physical)],
                ...(kind === 'dwelling'
                  ? ([[t.rows.functional, k(est.value.functional)]] as [string, string][])
                  : []),
                [t.rows.zone, k(est.value.zone)],
                [t.rows.mrp, k(est.value.mrpIndex)],
                ...(est.value.luxury !== 1
                  ? ([[t.rows.luxury, k(est.value.luxury)]] as [string, string][])
                  : []),
                ...full,
              ]}
            />
          )}
          {mode !== 'estimate' && full.length > 0 && <Rows lang={lang} rows={full} />}
          {tax?.ok && tax.value.aggregate && <Status>{t.rows.aggregate}</Status>}
          <p className="note">
            {mode === 'land' ? t.noteLand : mode === 'value' ? t.noteValue : t.noteEstimate}
          </p>
          <div className="bar">
            <Share lang={lang} />
          </div>
        </>
      )}
    </>
  )
}

export default function Property({ lang }: ToolProps) {
  return <PropertyTool lang={lang} land={false} />
}
