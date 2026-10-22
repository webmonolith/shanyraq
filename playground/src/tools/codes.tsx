import { localities } from '../../../data/phone.json'
import { Choice, Field, Rows, Share, Status, type ToolProps, useQuery } from '../ui'

type Zone = keyof typeof localities.zones
type Item = (typeof localities.items)[number] & { alsoIn?: string; ranges?: string[] }

const ITEMS = localities.items as Item[]
const ZONES = Object.keys(localities.zones) as Zone[]

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    label: 'Город, село или номер телефона',
    examples: ['Балхаш', '7187', '8 (7212) 41-22-33'],
    zones: 'Зона',
    all: 'Все зоны',
    head: ['Населённый пункт', 'Код'],
    digits: (n: number) => `+ ${n} цифр`,
    try: 'Примеры:',
    count: (n: number) => `Населённых пунктов: ${n} из ${ITEMS.length}.`,
    none: 'Не найдено в плане нумерации. Мобильные коды (700–778) — на странице проверки телефона.',
    place: 'Населённый пункт',
    zone: 'Зона (план 2022)',
    intl: 'Международный формат',
    trunk: 'По Казахстану через 8',
    local: 'Номер без кода',
    short: (n: number) => `Номер неполный: после кода нужно ещё ${n} цифр.`,
  },
  kk: {
    label: 'Қала, ауыл немесе телефон нөмірі',
    examples: ['Балқаш', '7187', '8 (7212) 41-22-33'],
    zones: 'Аймақ',
    all: 'Барлық аймақтар',
    head: ['Елді мекен', 'Код'],
    digits: (n: number) => `+ ${n} цифр`,
    try: 'Мысалдар:',
    count: (n: number) => `Елді мекендер: ${ITEMS.length} ішінен ${n}.`,
    none: 'Нөмірлеу жоспарында табылмады. Ұялы кодтар (700–778) — телефонды тексеру бетінде.',
    place: 'Елді мекен',
    zone: 'Аймақ (2022 жоспары)',
    intl: 'Халықаралық формат',
    trunk: 'Қазақстан бойынша 8 арқылы',
    local: 'Кодсыз нөмір',
    short: (n: number) => `Нөмір толық емес: кодтан кейін тағы ${n} цифр керек.`,
  },
}

/** `251 71 23`, `41 22 33`, `1 71 23`: two pairs at the end. */
const groupDigits = (s: string) => `${s.slice(0, -4)} ${s.slice(-4, -2)} ${s.slice(-2)}`

// Area codes all start with 7, so a leading 8 is the trunk prefix and 11 digits carry the country code.
const toNsn = (raw: string) => {
  const d = raw.replace(/\D/g, '')
  if (raw.trim().startsWith('+') || (d.length === 11 && d.startsWith('7'))) return d.slice(1)
  return d.startsWith('8') ? d.slice(1) : d
}

const prefixes = (i: Item) => [...(i.ranges ?? [i.code]), ...(i.alsoIn ? [i.alsoIn] : [])]

// Longest prefix wins, so 7272517… is Otegen Batyr rather than Almaty.
const byNumber = (nsn: string) => {
  const hits = ITEMS.map((i) => {
    const p = prefixes(i).find((p) => nsn.startsWith(p) || p.startsWith(nsn))
    return { i, len: p ? Math.min(p.length, nsn.length) : 0 }
  }).filter((h) => h.len > 0)
  const best = Math.max(0, ...hits.map((h) => h.len))
  return hits.filter((h) => h.len === best || best < 4).map((h) => h.i)
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е')

const byName = (q: string) =>
  ITEMS.filter((i) => [i.ru, i.kk, i.itu].some((s) => norm(s).includes(q)))

// A number found through `alsoIn` belongs to the Almaty network: 727 + 7 digits.
const areaCode = (i: Item, nsn: string) =>
  i.alsoIn && nsn.startsWith(i.alsoIn) ? i.alsoIn.slice(0, 3) : i.code

const dial = (code: string, nsn: string) => {
  const sub = groupDigits(nsn.slice(code.length))
  return { intl: `+7 ${code} ${sub}`, trunk: `8 ${code} ${sub}`, local: sub }
}

export default function Codes({ lang }: ToolProps) {
  const t = T[lang]
  const [q, setQ] = useQuery('q')
  const [zone, setZone] = useQuery('z')
  const query = q.trim()
  const numeric = /\d/.test(query) && !/\p{L}/u.test(query)
  const nsn = numeric ? toNsn(query) : ''
  const found = !query ? ITEMS : numeric ? (nsn ? byNumber(nsn) : []) : byName(norm(query))
  const items = found.filter((i) => !zone || i.zone === zone)
  const exact = numeric && found.length === 1 ? found[0] : undefined
  const area = exact && areaCode(exact, nsn)
  const missing = 10 - nsn.length
  return (
    <>
      <Field label={t.label} value={q} onChange={setQ} wide />
      <div className="bar">
        <span className="examples">
          {t.try}
          {t.examples.map((e) => (
            <button type="button" className="link" key={e} onClick={() => setQ(e)}>
              {e}
            </button>
          ))}
        </span>
        {query && <Share lang={lang} />}
      </div>
      {exact && area && nsn.length >= area.length && (
        <>
          <Rows
            lang={lang}
            rows={[
              [t.place, `${exact[lang]} (${area})`],
              [t.zone, localities.zones[exact.zone as Zone][lang]],
              ...(missing === 0
                ? (['intl', 'trunk', 'local'] as const).map((f): [string, string] => [
                    t[f],
                    dial(area, nsn)[f],
                  ])
                : []),
            ]}
          />
          {missing > 0 && <Status>{t.short(missing)}</Status>}
        </>
      )}
      <Choice
        label={t.zones}
        value={zone}
        options={[['', t.all], ...ZONES.map((z) => [z, localities.zones[z][lang]] as const)]}
        onChange={setZone}
      />
      {items.length === 0 ? (
        <Status ok={false}>{t.none}</Status>
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
              {items.map((i) => (
                <tr key={`${i.code} ${i.itu}`}>
                  <td className="wrap">
                    {i[lang]}
                    <br />
                    <small>{localities.zones[i.zone as Zone][lang]}</small>
                  </td>
                  <td>
                    {i.code}
                    <br />
                    <small>{t.digits(i.subscriberDigits)}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="bar">
        <span className="note">{t.count(items.length)}</span>
      </div>
    </>
  )
}
