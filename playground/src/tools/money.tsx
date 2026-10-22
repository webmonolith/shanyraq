import { useState } from 'react'
import { kk, ru } from 'shanyraq/i18n'
import { moneyToWords } from 'shanyraq/money'
import { Check, Choice, Field, Output, Status, type ToolProps } from '../ui'

const T = {
  ru: {
    label: 'Сумма',
    hint: 'Например 1234,50 или 1 000 000. Копейки — тиыны — до двух знаков.',
    lang: 'Язык',
    langs: [
      ['ru', 'русский'],
      ['kk', 'казахский'],
    ] as const,
    tiyn: 'Тиыны',
    tiyns: [
      ['digits', 'цифрами (как в платёжках)'],
      ['words', 'словами'],
    ] as const,
    currency: 'Написание валюты',
    explicitOne: '«бір жүз», «бір мың» (как в официальных актах)',
    capitalize: 'С заглавной буквы',
    messages: ru.money,
  },
  kk: {
    label: 'Сома',
    hint: 'Мысалы 1234,50 немесе 1 000 000. Тиын — екі таңбаға дейін.',
    lang: 'Тіл',
    langs: [
      ['kk', 'қазақ'],
      ['ru', 'орыс'],
    ] as const,
    tiyn: 'Тиын',
    tiyns: [
      ['digits', 'цифрмен (төлем құжаттарындағыдай)'],
      ['words', 'сөзбен'],
    ] as const,
    currency: 'Валютаның жазылуы',
    explicitOne: '«бір жүз», «бір мың» (ресми актілердегідей)',
    capitalize: 'Бас әріппен',
    messages: kk.money,
  },
}

export default function Money({ lang }: ToolProps) {
  const t = T[lang]
  const [value, setValue] = useState('1234,50')
  const [out, setOut] = useState<'ru' | 'kk'>(lang)
  const [tiyn, setTiyn] = useState<'digits' | 'words'>('digits')
  const [currency, setCurrency] = useState<'теңге' | 'тенге'>('теңге')
  const [explicitOne, setExplicitOne] = useState(true)
  const [capitalize, setCapitalize] = useState(true)
  const input = value.replace(/[\s ]/g, '')
  const r = input
    ? moneyToWords(input, { lang: out, tiyn, currency, explicitOne, capitalize })
    : undefined
  return (
    <>
      <div className="grid">
        <Field label={t.label} value={value} onChange={setValue} inputMode="decimal" />
        <Choice label={t.lang} value={out} options={t.langs} onChange={setOut} />
        <Choice label={t.tiyn} value={tiyn} options={t.tiyns} onChange={setTiyn} />
        {out === 'ru' && (
          <Choice
            label={t.currency}
            value={currency}
            options={[
              ['теңге', 'теңге'],
              ['тенге', 'тенге'],
            ]}
            onChange={setCurrency}
          />
        )}
      </div>
      <div className="bar">
        {out === 'kk' && (
          <Check label={t.explicitOne} checked={explicitOne} onChange={setExplicitOne} />
        )}
        <Check label={t.capitalize} checked={capitalize} onChange={setCapitalize} />
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <Output text={r.value} lang={lang} />
      )}
    </>
  )
}
