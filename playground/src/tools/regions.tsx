import { REGIONS, regionByKato, regionByPlateCode } from 'shanyraq/regions'
import { Field, Share, Status, type ToolProps, useQuery } from '../ui'

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    label: 'Название, центр, код КАТО или код на госномере',
    placeholder: 'Например: Абай, 75, 751110000, 02',
    head: ['Регион', 'Центр', 'Госномер', 'КАТО', 'Код КАТО'],
    kinds: { city: 'город республиканского значения', region: 'область' },
    found: (n: number) => `Найдено: ${n} из ${REGIONS.length}`,
    none: 'Ничего не найдено',
    all: `${REGIONS.length} объектов верхнего уровня КАТО: 17 областей и 3 города республиканского значения.`,
  },
  kk: {
    label: 'Атауы, орталығы, ӘАОЖ коды немесе мемлекеттік нөмірдегі код',
    placeholder: 'Мысалы: Абай, 75, 751110000, 02',
    head: ['Өңір', 'Орталығы', 'Мемл. нөмір', 'ӘАОЖ', 'ӘАОЖ коды'],
    kinds: { city: 'республикалық маңызы бар қала', region: 'облыс' },
    found: (n: number) => `Табылды: ${REGIONS.length} ішінен ${n}`,
    none: 'Ештеңе табылмады',
    all: `ӘАОЖ-дың ${REGIONS.length} жоғарғы деңгейлі нысаны: 17 облыс және республикалық маңызы бар 3 қала.`,
  },
}

const SORTED = [...REGIONS].sort((a, b) => a.plateCode.localeCompare(b.plateCode))

// Digits are codes: two digits may be a plate code or a KATO prefix, longer ones are KATO.
const search = (query: string) => {
  const q = query.trim().toLowerCase()
  if (!q) return SORTED
  const digits = q.replace(/\s/g, '')
  if (/^\d+$/.test(digits)) {
    const hits = [regionByPlateCode(digits), regionByKato(digits)]
    return SORTED.filter((r) => hits.includes(r))
  }
  return SORTED.filter((r) =>
    [r.name.ru, r.name.kk, r.name.en, r.center, r.id].some((s) => s.toLowerCase().includes(q)),
  )
}

export default function Regions({ lang }: ToolProps) {
  const t = T[lang]
  const [query, setQuery] = useQuery('q')
  const found = search(query)
  return (
    <>
      <Field label={t.label} value={query} onChange={setQuery} placeholder={t.placeholder} wide />
      <div className="bar">
        <Status ok={query.trim() ? found.length > 0 : undefined}>
          {!query.trim() ? t.all : found.length ? t.found(found.length) : t.none}
        </Status>
        {query.trim() && <Share lang={lang} />}
      </div>
      {found.length > 0 && (
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
              {found.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.name[lang]}
                    <small className="kind">{t.kinds[r.kind]}</small>
                  </td>
                  <td>{r.center}</td>
                  <td>{r.plateCode}</td>
                  <td>{r.katoPrefix}</td>
                  <td>
                    <code>{r.katoCode}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
