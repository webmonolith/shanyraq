import { type ReactNode, useState } from 'react'
import { kk, ru } from 'shanyraq/i18n'
import { formatPhone, parsePhone } from 'shanyraq/phone'
import { Check, Field, Rows, Share, Status, type ToolProps, useQuery } from '../ui'

const EXAMPLES = ['8 (701) 123-45-67', '+7 7172 55 12 34', '+7 495 123 45 67']

const OPERATORS = { kcell: 'Kcell', beeline: 'Beeline', 'tele2-altel': 'Tele2/Altel' } as const

const T = {
  ru: {
    label: 'Номер телефона',
    strict: 'Строгая проверка (только +7… или 8…, только коды Казахстана)',
    hint: 'Любая запись: +7 701 123 45 67, 8(701)1234567, 87011234567.',
    examples: 'Примеры:',
    valid: 'Номер корректен',
    country: 'Страна',
    countries: {
      KZ: 'Казахстан',
      RU: 'Россия',
      ambiguous: 'Казахстан или Россия (общий диапазон)',
    },
    type: 'Тип',
    types: {
      mobile: 'мобильный',
      landline: 'городской',
      other: 'негеографический код',
      unknown: 'неизвестно',
    },
    operator: 'Исходный оператор',
    mnp: ' (номер мог быть перенесён к другому оператору)',
    city: 'Город',
    formats: ['Международный', 'Национальный', 'E.164'],
    messages: ru.phone,
  },
  kk: {
    label: 'Телефон нөмірі',
    strict: 'Қатаң тексеру (тек +7… немесе 8…, тек Қазақстан кодтары)',
    hint: 'Кез келген жазу: +7 701 123 45 67, 8(701)1234567, 87011234567.',
    examples: 'Мысалдар:',
    valid: 'Нөмір дұрыс',
    country: 'Ел',
    countries: { KZ: 'Қазақстан', RU: 'Ресей', ambiguous: 'Қазақстан немесе Ресей (ортақ ауқым)' },
    type: 'Түрі',
    types: {
      mobile: 'ұялы',
      landline: 'қалалық',
      other: 'географиялық емес код',
      unknown: 'белгісіз',
    },
    operator: 'Бастапқы оператор',
    mnp: ' (нөмір басқа операторға ауысқан болуы мүмкін)',
    city: 'Қала',
    formats: ['Халықаралық', 'Ұлттық', 'E.164'],
    messages: kk.phone,
  },
}

export default function Phone({ lang }: ToolProps) {
  const t = T[lang]
  const [value, setValue] = useQuery('q')
  const [strict, setStrict] = useState(false)
  const r = value.trim() ? parsePhone(value, { strict }) : undefined
  return (
    <>
      <Field label={t.label} value={value} onChange={setValue} inputMode="tel" wide />
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
        {value.trim() && <Share lang={lang} />}
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          <Status ok>{t.valid}</Status>
          <Rows
            lang={lang}
            rows={[
              [t.country, t.countries[r.value.country]],
              [t.type, t.types[r.value.type]],
              ...(r.value.originalOperator
                ? [[t.operator, OPERATORS[r.value.originalOperator] + t.mnp] as [string, string]]
                : []),
              ...(r.value.city
                ? [[t.city, `${r.value.city[lang]} (${r.value.areaCode})`] as [string, string]]
                : []),
              ...(['international', 'national', 'e164'] as const).map(
                (f, i): [string, ReactNode] => [
                  t.formats[i] as string,
                  <code key={f}>{formatPhone(r.value, f)}</code>,
                ],
              ),
            ]}
          />
        </>
      )}
    </>
  )
}
