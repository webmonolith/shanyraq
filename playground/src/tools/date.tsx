import { useState } from 'react'
import { formatDate, parseDate } from 'shanyraq/date'
import { kk, ru } from 'shanyraq/i18n'
import { Field, Output, Rows, Status, type ToolProps } from '../ui'

const T = {
  ru: {
    date: 'Дата',
    ru: 'По-русски',
    kk: 'По-казахски',
    attributive: 'По-казахски перед существительным («…қазандағы № 1 бұйрық»)',
    numeric: 'Цифрами',
    parse: 'Распознать дату в тексте',
    parseHint: 'Например: 22.10.2026, 2026-10-22, 22 октября 2026 года, 2026 жылғы 22 қазан',
    parsed: 'Распознано',
    messages: ru.date,
  },
  kk: {
    date: 'Күн',
    ru: 'Орысша',
    kk: 'Қазақша',
    attributive: 'Қазақша, зат есімнің алдында («…қазандағы № 1 бұйрық»)',
    numeric: 'Цифрмен',
    parse: 'Мәтіндегі күнді тану',
    parseHint: 'Мысалы: 22.10.2026, 2026-10-22, 2026 жылғы 22 қазан, 22 октября 2026 года',
    parsed: 'Танылды',
    messages: kk.date,
  },
}

export default function DateTool({ lang }: ToolProps) {
  const t = T[lang]
  const [date, setDate] = useState('2026-10-22')
  const [text, setText] = useState('')
  const variants = [
    [t.ru, { lang: 'ru' }],
    [t.kk, { lang: 'kk' }],
    [t.attributive, { lang: 'kk', attributive: true }],
    [t.numeric, { style: 'numeric' }],
  ] as const
  const first = formatDate(date)
  const parsed = text.trim() ? parseDate(text) : undefined
  return (
    <>
      <Field label={t.date} type="date" value={date} onChange={setDate} />
      {first.ok ? (
        <Rows
          rows={variants.map(([label, options]) => {
            const r = formatDate(date, options)
            return [label, <Output key={label} text={r.ok ? r.value : ''} lang={lang} />]
          })}
        />
      ) : (
        <Status ok={false}>{t.messages[first.error]}</Status>
      )}
      <h3>{t.parse}</h3>
      <Field label={t.parse} value={text} onChange={setText} placeholder={t.parseHint} wide />
      {!parsed ? (
        <Status>{t.parseHint}</Status>
      ) : parsed.ok ? (
        <Status ok>
          {t.parsed}: <code>{parsed.value.iso}</code>
        </Status>
      ) : (
        <Status ok={false}>{t.messages[parsed.error]}</Status>
      )}
    </>
  )
}
