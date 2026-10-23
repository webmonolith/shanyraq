import { useEffect, useRef } from 'react'
import { kk, ru } from 'shanyraq/i18n'
import { type Fraction, type Heir, type Heirs, inheritanceShares } from 'shanyraq/inheritance'
import { procedureTerm } from 'shanyraq/procedure'
import {
  Check,
  Choice,
  dmy,
  Field,
  fmt,
  Rows,
  Share,
  Status,
  type ToolProps,
  useQuery,
} from '../ui'

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    date: 'Дата смерти (открытия наследства)',
    estate: 'Личное имущество умершего, ₸',
    joint: 'Нажитое в браке с пережившим супругом, ₸',
    jointHint: 'пусто — нет',
    spouse: 'Супруг(а)',
    yesNo: [
      ['1', 'есть'],
      ['0', 'нет'],
    ] as const,
    children: 'Дети',
    grandchildren: 'Внуки вместо умерших детей',
    listHint: 'по числу у каждого: 2, 1',
    parents: 'Родители',
    two: [
      ['0', 'нет'],
      ['1', 'один'],
      ['2', 'оба'],
    ] as const,
    dependants: 'Нетрудоспособные иждивенцы',
    later: 'Если нет детей, супруга и родителей',
    fields: {
      siblings: 'Братья и сёстры',
      nephews: 'Племянники вместо умерших братьев и сестёр',
      grandparents: 'Дедушки и бабушки',
      unclesAunts: 'Дяди и тёти',
      cousins: 'Двоюродные вместо умерших дядь и тёть',
      greatGrandparents: 'Прадедушки и прабабушки',
      fifth: 'Двоюродные внуки, двоюродные дедушки и бабушки',
      sixth: 'Двоюродные правнуки, племянники, дяди и тёти',
      seventh: 'Отчим, мачеха, пасынки, сводные — 10+ лет одной семьёй',
    },
    will: 'Есть завещание: обязательная доля',
    wSpouse: 'Супруг(а) нетрудоспособен',
    wChildren: 'Из детей несовершеннолетних или нетрудоспособных',
    wParents: 'Из родителей нетрудоспособных',
    names: {
      spouse: 'Супруг(а)',
      children: 'Ребёнок',
      grandchildren: 'Внук вместо родителя',
      parents: 'Родитель',
      siblings: 'Брат или сестра',
      nephews: 'Племянник вместо родителя',
      grandparents: 'Дедушка или бабушка',
      unclesAunts: 'Дядя или тётя',
      cousins: 'Двоюродный вместо родителя',
      greatGrandparents: 'Прадедушка или прабабушка',
      fifth: 'Наследник 5-й очереди',
      sixth: 'Наследник 6-й очереди',
      seventh: 'Наследник 7-й очереди',
      dependants: 'Иждивенец',
    } satisfies Record<Heir, string>,
    order: 'Призывается очередь',
    each: 'Каждому',
    head: ['Наследник', 'Каждому'],
    people: (n: number) => `${n} чел.`,
    branch: (i: number) => `ветвь ${i + 1}`,
    marital: 'Супругу как собственнику (½ нажитого)',
    estateTotal: 'Наследство',
    obligatory: 'Обязательная доля — не меньше',
    free: 'Можно завещать свободно',
    deadline: 'Принять или отказаться до',
    moved: (d: string) => `Шесть месяцев истекают ${d} — выходной, срок переносится (ГК ст. 175).`,
    escheat:
      'Наследников нет: через год суд по заявлению акимата признаёт наследство выморочным, и оно переходит государству (ГК ст. 1083).',
    badList: 'Список внуков, племянников или двоюродных — числа через запятую, например 2, 1.',
    note: 'Доли равные внутри очереди (ГК ст. 1061–1064); умерший наследник передаёт долю своим детям поровну (ст. 1067). Наследники могут изменить доли нотариальным соглашением (ст. 1060 п. 4).',
    messages: ru.inheritance,
  },
  kk: {
    date: 'Қайтыс болған күні (мұраның ашылуы)',
    estate: 'Қайтыс болғанның жеке мүлкі, ₸',
    joint: 'Тірі қалған жұбайымен некеде жиналған, ₸',
    jointHint: 'бос — жоқ',
    spouse: 'Жұбайы',
    yesNo: [
      ['1', 'бар'],
      ['0', 'жоқ'],
    ] as const,
    children: 'Балалары',
    grandchildren: 'Қайтыс болған балалардың орнына немерелер',
    listHint: 'әрқайсысының саны: 2, 1',
    parents: 'Ата-анасы',
    two: [
      ['0', 'жоқ'],
      ['1', 'біреуі'],
      ['2', 'екеуі'],
    ] as const,
    dependants: 'Еңбекке жарамсыз асырауындағылар',
    later: 'Балалары, жұбайы және ата-анасы болмаса',
    fields: {
      siblings: 'Аға-інілері мен апа-сіңлілері',
      nephews: 'Қайтыс болған бауырлардың орнына жиендері',
      grandparents: 'Аталары мен әжелері',
      unclesAunts: 'Ағалары мен апалары (әке-шешесінің бауырлары)',
      cousins: 'Қайтыс болғандардың орнына немере бауырлары',
      greatGrandparents: 'Бабалары мен ұлы әжелері',
      fifth: 'Немере жиендері, немере аталары мен әжелері',
      sixth: 'Немере шөберелері, жиендері, ағалары мен апалары',
      seventh: 'Өгей әке, өгей шеше, өгей балалар — 10+ жыл бір отбасы',
    },
    will: 'Өсиет бар: міндетті үлес',
    wSpouse: 'Жұбайы еңбекке жарамсыз',
    wChildren: 'Балалардың ішінен кәмелетке толмағандары немесе еңбекке жарамсыздары',
    wParents: 'Ата-анасының ішінен еңбекке жарамсыздары',
    names: {
      spouse: 'Жұбайы',
      children: 'Баласы',
      grandchildren: 'Ата-анасының орнына немере',
      parents: 'Ата-анасы',
      siblings: 'Бауыры',
      nephews: 'Ата-анасының орнына жиен',
      grandparents: 'Атасы немесе әжесі',
      unclesAunts: 'Ағасы немесе апасы',
      cousins: 'Ата-анасының орнына немере бауыр',
      greatGrandparents: 'Бабасы немесе ұлы әжесі',
      fifth: '5-кезектегі мұрагер',
      sixth: '6-кезектегі мұрагер',
      seventh: '7-кезектегі мұрагер',
      dependants: 'Асырауындағы',
    } satisfies Record<Heir, string>,
    order: 'Шақырылатын кезек',
    each: 'Әрқайсысына',
    head: ['Мұрагер', 'Әрқайсысына'],
    people: (n: number) => `${n} адам`,
    branch: (i: number) => `${i + 1}-тармақ`,
    marital: 'Жұбайына меншік иесі ретінде (жиналғанның ½)',
    estateTotal: 'Мұра',
    obligatory: 'Міндетті үлес — кемінде',
    free: 'Еркін өсиет етуге болады',
    deadline: 'Қабылдау немесе бас тарту мерзімі',
    moved: (d: string) => `Алты ай ${d} аяқталады — демалыс, мерзім ауыстырылады (АК 175-бап).`,
    escheat:
      'Мұрагерлер жоқ: бір жылдан кейін әкімдіктің өтініші бойынша сот мұраны иесіз деп таниды, ол мемлекетке өтеді (АК 1083-бап).',
    badList: 'Немерелер, жиендер немесе немере бауырлар тізімі — үтір арқылы сандар, мысалы 2, 1.',
    note: 'Кезек ішінде үлестер тең (АК 1061–1064-баптар); қайтыс болған мұрагердің үлесі оның балаларына тең бөлінеді (1067-бап). Мұрагерлер үлестерді нотариаттық келісіммен өзгерте алады (1060-бап 4-т.).',
    messages: kk.inheritance,
  },
}

type Count = keyof typeof T.ru.fields
const LISTS = new Set<Count>(['nephews', 'cousins'])
const FIELDS = Object.keys(T.ru.fields) as Count[]

const list = (s: string): number[] | undefined => {
  const parts = s.split(/[,;\s]+/).filter(Boolean)
  return parts.every((p) => /^\d+$/.test(p)) ? parts.map(Number) : undefined
}
const tenge = (v: number) => `${fmt(v, Number.isInteger(v) ? 0 : 2)} ₸`
const share = ([n, d]: Fraction) => (n === d ? '1' : `${n}/${d}`)

export default function Inheritance({ lang }: ToolProps) {
  const t = T[lang]
  const [date, setDate] = useQuery('d', '2026-10-01')
  const [estate, setEstate] = useQuery('e', '30000000')
  const [joint, setJoint] = useQuery('j', '')
  const [spouse, setSpouse] = useQuery('s', '1')
  const [children, setChildren] = useQuery('c', '2')
  const [grand, setGrand] = useQuery('g', '')
  const [parents, setParents] = useQuery('p', '0')
  const [dependants, setDependants] = useQuery('dep', '')
  const later: Record<Count, [string, (v: string) => void]> = {
    siblings: useQuery('siblings', ''),
    nephews: useQuery('nephews', ''),
    grandparents: useQuery('grandparents', ''),
    unclesAunts: useQuery('unclesAunts', ''),
    cousins: useQuery('cousins', ''),
    greatGrandparents: useQuery('greatGrandparents', ''),
    fifth: useQuery('fifth', ''),
    sixth: useQuery('sixth', ''),
    seventh: useQuery('seventh', ''),
  }
  const [will, setWill] = useQuery('w', '')
  const [wSpouse, setWSpouse] = useQuery('ws', '')
  const [wChildren, setWChildren] = useQuery('wc', '')
  const [wParents, setWParents] = useQuery('wp', '')

  const more = useRef<HTMLDetailsElement>(null)
  const anyLater = FIELDS.some((f) => later[f][0])
  useEffect(() => {
    if (anyLater && more.current) more.current.open = true
  }, [anyLater])

  const lists = [list(grand), list(later.nephews[0]), list(later.cousins[0])]
  const bad = lists.some((v) => v === undefined)
  const count = (f: Count) => Number(later[f][0] || 0)
  const heirs: Heirs = {
    spouse: spouse === '1',
    children: Number(children || 0),
    grandchildren: lists[0] ?? [],
    parents: Number(parents),
    siblings: count('siblings'),
    nephews: lists[1] ?? [],
    grandparents: count('grandparents'),
    unclesAunts: count('unclesAunts'),
    cousins: lists[2] ?? [],
    greatGrandparents: count('greatGrandparents'),
    fifth: count('fifth'),
    sixth: count('sixth'),
    seventh: count('seventh'),
    dependants: Number(dependants || 0),
  }
  const r = bad
    ? undefined
    : inheritanceShares(heirs, {
        estate: estate || 0,
        joint: joint || 0,
        ...(will
          ? {
              obligatory: {
                spouse: spouse === '1' && !!wSpouse,
                children: Number(wChildren || 0),
                parents: Number(wParents || 0),
              },
            }
          : {}),
      })
  const term = date ? procedureTerm(date, { months: 6 }) : undefined

  return (
    <>
      <div className="grid">
        <Field label={t.date} value={date} onChange={setDate} type="date" />
        <Field label={t.estate} value={estate} onChange={setEstate} inputMode="decimal" />
        <Field
          label={t.joint}
          value={joint}
          onChange={setJoint}
          placeholder={t.jointHint}
          inputMode="decimal"
        />
        <Choice
          label={t.spouse}
          value={spouse === '0' ? '0' : '1'}
          options={t.yesNo}
          onChange={setSpouse}
        />
        <Field label={t.children} value={children} onChange={setChildren} inputMode="numeric" />
        <Field
          label={t.grandchildren}
          value={grand}
          onChange={setGrand}
          placeholder={t.listHint}
          inputMode="text"
        />
        <Choice
          label={t.parents}
          value={parents === '1' || parents === '2' ? parents : '0'}
          options={t.two}
          onChange={setParents}
        />
        <Field
          label={t.dependants}
          value={dependants}
          onChange={setDependants}
          inputMode="numeric"
        />
      </div>
      <details className="more" ref={more}>
        <summary>{t.later}</summary>
        <div className="grid">
          {FIELDS.map((f) => (
            <Field
              key={f}
              label={t.fields[f]}
              value={later[f][0]}
              onChange={later[f][1]}
              inputMode={LISTS.has(f) ? 'text' : 'numeric'}
              {...(LISTS.has(f) ? { placeholder: t.listHint } : {})}
            />
          ))}
        </div>
      </details>
      <Check label={t.will} checked={!!will} onChange={(v) => setWill(v ? '1' : '')} />
      {will && (
        <div className="grid">
          {spouse === '1' && (
            <Check
              label={t.wSpouse}
              checked={!!wSpouse}
              onChange={(v) => setWSpouse(v ? '1' : '')}
            />
          )}
          <Field
            label={t.wChildren}
            value={wChildren}
            onChange={setWChildren}
            inputMode="numeric"
          />
          <Field label={t.wParents} value={wParents} onChange={setWParents} inputMode="numeric" />
        </div>
      )}
      {bad ? (
        <Status ok={false}>{t.badList}</Status>
      ) : !r ? null : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          <div className="result">
            <div>
              <small>{t.order}</small>
              <b>{r.value.order || '—'}</b>
            </div>
            <div>
              <small>{t.estateTotal}</small>
              <b>{tenge(r.value.estate)}</b>
            </div>
            {term?.ok && (
              <div>
                <small>{t.deadline}</small>
                <b>{dmy(term.value.end)}</b>
              </div>
            )}
          </div>
          {term?.ok && term.value.moved && <Status>{t.moved(dmy(term.value.due))}</Status>}
          {r.value.order === 0 ? (
            <Status ok={false}>{t.escheat}</Status>
          ) : (
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
                  {r.value.heirs.map((h) => (
                    <tr key={`${h.heir}${h.branch ?? ''}`}>
                      <td>
                        {t.names[h.heir]}
                        <br />
                        <small>
                          {t.people(h.count)}
                          {h.branch === undefined ? '' : `, ${t.branch(h.branch)}`}
                        </small>
                      </td>
                      <td>
                        <b>{share(h.share)}</b>
                        <br />
                        <small>{tenge(h.amount)}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Rows
            lang={lang}
            rows={[
              ...(r.value.marital
                ? ([[t.marital, tenge(r.value.marital)]] as [string, string][])
                : []),
              ...r.value.obligatory.map(
                (o) =>
                  [
                    `${t.obligatory}: ${t.names[o.heir].toLowerCase()} × ${o.count}`,
                    `${share(o.share)} · ${tenge(o.amount)}`,
                  ] as [string, string],
              ),
              ...(r.value.obligatory.length
                ? ([[t.free, share(r.value.free)]] as [string, string][])
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
