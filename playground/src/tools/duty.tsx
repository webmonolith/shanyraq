import { claimDuty } from 'shanyraq/claim'
import { kk, ru } from 'shanyraq/i18n'
import { getTaxYear } from 'shanyraq/tax'
import { duty as DUTY } from '../../../data/claim.json'
import { Check, Choice, Field, fmt, Rows, Share, Status, type ToolProps, useQuery } from '../ui'

const YEAR = getTaxYear() as { year: number; mrp: number }
const money = (n: number) => `${fmt(n, 2)} ₸`

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    price: 'Цена иска, ₸',
    payer: 'Истец',
    payers: [
      ['individual', 'физическое лицо — 1 %'],
      ['legal', 'юридическое лицо — 3 %'],
    ] as const,
    order: 'Заявление о судебном приказе (50 % пошлины)',
    duty: 'Госпошлина',
    percent: 'Ставка',
    max: (mrp: number) => `Максимум (${fmt(mrp)} МРП × ${fmt(YEAR.mrp)} ₸)`,
    capped: 'Пошлина ограничена максимумом.',
    note: `Иски имущественного характера о взыскании денег, МРП ${YEAR.year} года. Цена иска — вся сумма к взысканию: долг, неустойка, проценты (ГПК, ст. 104).`,
    hint: 'Введите цену иска.',
    messages: ru.claim,
  },
  kk: {
    price: 'Талап бағасы, ₸',
    payer: 'Талапкер',
    payers: [
      ['individual', 'жеке тұлға — 1 %'],
      ['legal', 'заңды тұлға — 3 %'],
    ] as const,
    order: 'Сот бұйрығын шығару туралы өтініш (баждың 50 %)',
    duty: 'Мемлекеттік баж',
    percent: 'Мөлшерлеме',
    max: (mrp: number) => `Ең көбі (${fmt(mrp)} АЕК × ${fmt(YEAR.mrp)} ₸)`,
    capped: 'Баж ең жоғары мөлшермен шектелді.',
    note: `Ақша өндіру туралы мүліктік сипаттағы талаптар, ${YEAR.year} жылғы АЕК. Талап бағасы — өндірілетін бүкіл сома: қарыз, айып, пайыздар (АПК, 104-бап).`,
    hint: 'Талап бағасын енгізіңіз.',
    messages: kk.claim,
  },
}

export default function Duty({ lang }: ToolProps) {
  const t = T[lang]
  const [price, setPrice] = useQuery('q', '1000000')
  const [payerQ, setPayer] = useQuery('payer', 'individual')
  const payer = payerQ === 'legal' ? 'legal' : 'individual'
  const [orderQ, setOrder] = useQuery('order', '')
  const r = price.trim() ? claimDuty(price, { payer, courtOrder: orderQ === '1' }) : undefined
  // A court order halves the cap too (art. 665 p. 1 subp. 10 takes 50 % of the whole rate).
  const maxMrp =
    (DUTY.property[payer].maxMrp * (orderQ === '1' ? DUTY.courtOrder.share : 100)) / 100
  return (
    <>
      <div className="grid">
        <Field label={t.price} value={price} onChange={setPrice} inputMode="decimal" />
        <Choice label={t.payer} value={payer} options={t.payers} onChange={setPayer} />
        <Check label={t.order} checked={orderQ === '1'} onChange={(v) => setOrder(v ? '1' : '')} />
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          <div className="result">
            <div>
              <small>{t.duty}</small>
              <b>{money(r.value.duty)}</b>
            </div>
          </div>
          {r.value.capped && <Status>{t.capped}</Status>}
          <Rows
            lang={lang}
            rows={[
              [t.percent, `${String(r.value.percent).replace('.', ',')} %`],
              [t.max(maxMrp), money(maxMrp * YEAR.mrp)],
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
