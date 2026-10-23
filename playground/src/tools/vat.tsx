import { kk, ru } from 'shanyraq/i18n'
import { moneyToWords } from 'shanyraq/money'
import { addVAT, extractVAT } from 'shanyraq/tax'
import { Choice, Field, fmt, Output, Share, Status, type ToolProps, useQuery } from '../ui'

type Rate = '16' | '10' | '5' | '0'

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    amount: 'Сумма, ₸',
    mode: 'Сумма указана',
    modes: [
      ['without', 'без НДС — начислить'],
      ['with', 'с НДС — выделить'],
    ] as const,
    rate: 'Ставка',
    rates: [
      ['16', '16 % — основная'],
      ['10', '10 % — отечественная периодика'],
      ['5', '5 % — лекарства и медуслуги (2026)'],
      ['0', '0 % — экспорт и др.'],
    ] as const,
    net: 'Без НДС',
    vat: (r: string) => `НДС ${r} %`,
    gross: 'С НДС',
    words: 'Для документа',
    phrase: (gross: string, r: string, vat: string) => `${gross}, в том числе НДС ${r} % — ${vat}`,
    hint: 'Например 1 000 000 или 1160,50.',
    messages: ru.tax,
  },
  kk: {
    amount: 'Сома, ₸',
    mode: 'Сома көрсетілген',
    modes: [
      ['without', 'ҚҚС-сыз — есептеу'],
      ['with', 'ҚҚС-пен — бөліп алу'],
    ] as const,
    rate: 'Мөлшерлеме',
    rates: [
      ['16', '16 % — негізгі'],
      ['10', '10 % — отандық мерзімді басылымдар'],
      ['5', '5 % — дәрілер мен медициналық қызметтер (2026)'],
      ['0', '0 % — экспорт және т.б.'],
    ] as const,
    net: 'ҚҚС-сыз',
    vat: (r: string) => `ҚҚС ${r} %`,
    gross: 'ҚҚС-пен',
    words: 'Құжат үшін',
    phrase: (gross: string, r: string, vat: string) => `${gross}, оның ішінде ҚҚС ${r} % — ${vat}`,
    hint: 'Мысалы 1 000 000 немесе 1160,50.',
    messages: kk.tax,
  },
}

export default function VatTool({ lang }: ToolProps) {
  const t = T[lang]
  const [value, setValue] = useQuery('q', '1000000')
  const [modeQ, setMode] = useQuery('mode', 'without')
  const mode = modeQ === 'with' ? 'with' : 'without'
  const [rateQ, setRate] = useQuery('rate', '16')
  const rate = (['16', '10', '5', '0'] as Rate[]).find((x) => x === rateQ) ?? '16'
  const r = value.trim()
    ? (mode === 'without' ? addVAT : extractVAT)(value, { rate: Number(rate) })
    : undefined
  const words = (n: number) => {
    const w = moneyToWords(n, { lang })
    return w.ok ? w.value : fmt(n, 2)
  }
  return (
    <>
      <div className="grid">
        <Field label={t.amount} value={value} onChange={setValue} inputMode="decimal" />
        <Choice label={t.mode} value={mode} options={t.modes} onChange={setMode} />
        <Choice label={t.rate} value={rate} options={t.rates} onChange={setRate} />
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          <div className="result">
            <div>
              <small>{t.net}</small>
              <b>{fmt(r.value.net, 2)} ₸</b>
            </div>
            <div>
              <small>{t.vat(rate)}</small>
              <b>{fmt(r.value.vat, 2)} ₸</b>
            </div>
            <div>
              <small>{t.gross}</small>
              <b>{fmt(r.value.gross, 2)} ₸</b>
            </div>
          </div>
          <h3>{t.words}</h3>
          <Output text={t.phrase(words(r.value.gross), rate, words(r.value.vat))} lang={lang} />
          <div className="bar">
            <Share lang={lang} />
          </div>
        </>
      )}
    </>
  )
}
