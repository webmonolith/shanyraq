import { type ReactNode, useState } from 'react'
import { createFaker } from 'shanyraq/faker'
import { kk, ru } from 'shanyraq/i18n'
import { formatIBAN, parseIBAN } from 'shanyraq/iban'
import { Check, Copy, Field, Rows, Status, type ToolProps } from '../ui'

const fake = createFaker(2026)
const EXAMPLES = [fake.iban({ bankCode: '722' }), fake.iban({ bankCode: '601' })]

const T = {
  ru: {
    label: 'IBAN',
    strict: 'Строгая проверка (без пробелов, без I/O/Q в счёте, только действующие банки)',
    hint: '20 символов, начинается с KZ. Пробелы и строчные буквы допускаются.',
    examples: 'Примеры:',
    valid: 'IBAN корректен',
    formatted: 'Запись группами',
    bank: 'Банк',
    bic: 'БИК',
    code: 'Код банка',
    account: 'Номер счёта в банке',
    check: 'Контрольные цифры',
    inactive: ' — код уже не действует в справочнике НБРК',
    unknownBank: 'код не найден в справочнике НБРК',
    messages: ru.iban,
  },
  kk: {
    label: 'IBAN',
    strict: 'Қатаң тексеру (бос орынсыз, шотта I/O/Q жоқ, тек жұмыс істеп тұрған банктер)',
    hint: '20 таңба, KZ-тен басталады. Бос орын мен кіші әріптерге рұқсат етіледі.',
    examples: 'Мысалдар:',
    valid: 'IBAN дұрыс',
    formatted: 'Топтап жазу',
    bank: 'Банк',
    bic: 'БСК',
    code: 'Банк коды',
    account: 'Банктегі шот нөмірі',
    check: 'Бақылау цифрлары',
    inactive: ' — код ҰБ анықтамалығында енді қолданылмайды',
    unknownBank: 'код ҰБ анықтамалығында табылмады',
    messages: kk.iban,
  },
}

export default function Iban({ lang }: ToolProps) {
  const t = T[lang]
  const [value, setValue] = useState('')
  const [strict, setStrict] = useState(false)
  const r = value.trim() ? parseIBAN(value, { strict }) : undefined
  const bank = r?.ok ? r.value.bank : undefined
  return (
    <>
      <Field label={t.label} value={value} onChange={setValue} placeholder="KZ…" wide />
      <div className="bar">
        <Check label={t.strict} checked={strict} onChange={setStrict} />
        <span className="examples">
          {t.examples}
          {EXAMPLES.map((e) => (
            <button type="button" className="link" key={e} onClick={() => setValue(e)}>
              {e}
            </button>
          ))}
        </span>
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          <Status ok>{t.valid}</Status>
          <Rows
            rows={[
              [
                t.formatted,
                <span className="copyable" key="f">
                  <code>{formatIBAN(r.value)}</code>
                  <Copy text={formatIBAN(r.value)} lang={lang} />
                </span>,
              ],
              [t.bank, bank ? bank.name[lang] + (bank.active ? '' : t.inactive) : t.unknownBank],
              ...(bank ? [[t.bic, <code key="b">{bank.bic}</code>] as [string, ReactNode]] : []),
              [t.code, <code key="c">{r.value.bankCode}</code>],
              [t.account, <code key="a">{r.value.account}</code>],
              [t.check, <code key="d">{r.value.checkDigits}</code>],
            ]}
          />
        </>
      )}
    </>
  )
}
