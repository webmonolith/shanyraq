import { getTaxYear } from 'shanyraq/tax'
import fees from '../../../data/fees.json'
import { Field, fmt, Share, Status, type ToolProps, useQuery } from '../ui'

const YEAR = getTaxYear() as { year: number; mrp: number }

type Group = keyof typeof fees.groups
const GROUPS = Object.keys(fees.groups) as Group[]

const tenge = (mrp: number) => {
  const v = Math.round(mrp * YEAR.mrp * 100) / 100
  return fmt(v, Number.isInteger(v) ? 0 : 2)
}
const mrpText = (mrp: number) => String(mrp).replace('.', ',')

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    search: 'Поиск: паспорт, скорость, доверенность…',
    all: 'Все',
    head: ['Что', `₸, ${YEAR.year}`],
    mrp: 'МРП',
    half: 'за 7 суток',
    empty: 'Ничего не найдено.',
    count: (n: number) => `Позиций: ${n}. 1 МРП = ${fmt(YEAR.mrp)} ₸.`,
  },
  kk: {
    search: 'Іздеу: паспорт, жылдамдық, сенімхат…',
    all: 'Барлығы',
    head: ['Не', `₸, ${YEAR.year}`],
    mrp: 'АЕК',
    half: '7 тәулікте',
    empty: 'Ештеңе табылмады.',
    count: (n: number) => `Позициялар: ${n}. 1 АЕК = ${fmt(YEAR.mrp)} ₸.`,
  },
}

export default function Fees({ lang }: ToolProps) {
  const t = T[lang]
  const [q, setQ] = useQuery('q')
  const [group, setGroup] = useQuery('g')
  const query = q.trim().toLowerCase()
  const items = fees.items.filter(
    (i) =>
      (!group || i.group === group) &&
      (!query || `${i[lang]} ${i.ref}`.toLowerCase().includes(query)),
  )
  return (
    <>
      <Field label={t.search} value={q} onChange={setQ} wide />
      <div className="chips">
        {['', ...GROUPS].map((g) => (
          <button
            type="button"
            key={g}
            className={g === group ? 'chip on' : 'chip'}
            aria-pressed={g === group}
            onClick={() => setGroup(g)}
          >
            {g ? fees.groups[g as Group][lang] : t.all}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <Status ok={false}>{t.empty}</Status>
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
                <tr key={`${i.ref} ${i.ru}`}>
                  <td className="wrap">
                    {i[lang]}
                    <br />
                    <small lang="ru">{i.ref}</small>
                  </td>
                  <td>
                    {tenge(i.mrp)}
                    <br />
                    <small>
                      {mrpText(i.mrp)} {t.mrp}
                    </small>
                    {'half' in i && i.half && (
                      <>
                        <br />
                        <small>
                          {t.half}
                          <br />
                          {tenge(i.mrp / 2)} ₸
                        </small>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="bar">
        <span className="note">{t.count(items.length)}</span>
        <Share lang={lang} />
      </div>
    </>
  )
}
