import { kk, ru } from 'shanyraq/i18n'
import { getTaxYear, mrpToTenge } from 'shanyraq/tax'
import { Field, fmt, Output, Share, Status, type ToolProps, useQuery } from '../ui'

const YEAR = getTaxYear() as { year: number; mrp: number; mzp: number }
const PRESETS = ['1', '5', '10', '30', '100', '1000']

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    mrp: 'Количество МРП',
    tenge: 'Или сумма в тенге — сколько это МРП',
    tengeLabel: 'Сумма, ₸',
    result: (n: string, t: string) => `${n} МРП = ${t} ₸`,
    back: (t: string, n: string) => `${t} ₸ = ${n} МРП`,
    presets: 'Часто:',
    hint: `1 МРП в ${YEAR.year} году — ${fmt(YEAR.mrp)} ₸.`,
    messages: ru.tax,
  },
  kk: {
    mrp: 'АЕК саны',
    tenge: 'Немесе теңгедегі сома — бұл неше АЕК',
    tengeLabel: 'Сома, ₸',
    result: (n: string, t: string) => `${n} АЕК = ${t} ₸`,
    back: (t: string, n: string) => `${t} ₸ = ${n} АЕК`,
    presets: 'Жиі:',
    hint: `${YEAR.year} жылы 1 АЕК — ${fmt(YEAR.mrp)} ₸.`,
    messages: kk.tax,
  },
}

const num = (s: string) => Number(s.replace(/[\s ]/g, '').replace(',', '.'))

export default function Mrp({ lang }: ToolProps) {
  const t = T[lang]
  const [count, setCount] = useQuery('q', '10')
  const [tenge, setTenge] = useQuery('t')
  const r = count.trim() ? mrpToTenge(count) : undefined
  const back = num(tenge)
  return (
    <>
      <Field label={t.mrp} value={count} onChange={setCount} inputMode="decimal" wide />
      <div className="bar">
        <span className="examples">
          {t.presets}
          {PRESETS.map((p) => (
            <button type="button" className="link" key={p} onClick={() => setCount(p)}>
              {p}
            </button>
          ))}
        </span>
        {r?.ok && <Share lang={lang} />}
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : r.ok ? (
        <Output
          text={t.result(
            fmt(num(count), Number.isInteger(num(count)) ? 0 : 2),
            fmt(r.value, Number.isInteger(r.value) ? 0 : 2),
          )}
          lang={lang}
        />
      ) : (
        <Status ok={false}>{t.messages[r.error]}</Status>
      )}
      <h3>{t.tenge}</h3>
      <Field label={t.tengeLabel} value={tenge} onChange={setTenge} inputMode="decimal" wide />
      {tenge.trim() &&
        (Number.isFinite(back) && back >= 0 ? (
          <Output text={t.back(fmt(back), fmt(back / YEAR.mrp, 2))} lang={lang} />
        ) : (
          <Status ok={false}>{t.messages.invalid}</Status>
        ))}
    </>
  )
}
