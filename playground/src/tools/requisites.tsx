import { useMemo, useState } from 'react'
import { createFaker } from 'shanyraq/faker'
import { kk, ru } from 'shanyraq/i18n'
import { formatIBAN, getBank, parseIBAN } from 'shanyraq/iban'
import { formatPhone, parsePhone } from 'shanyraq/phone'
import { parseTaxId } from 'shanyraq/taxid'
import { Copy, Status, type ToolProps } from '../ui'

const fake = createFaker(2026)
const SAMPLE = {
  ru: `ТОО «Пример», БИН ${fake.bin()}
ИИК ${fake
    .iban({ bankCode: '722' })
    .replace(/(.{4})/g, '$1 ')
    .trim()} в АО «Kaspi Bank», БИК CASPKZKA
Директор: ИИН ${fake.iin()}, тел. 8 (701) 123-45-67`,
  kk: `«Мысал» ЖШС, БСН ${fake.bin()}
ЖСК ${fake
    .iban({ bankCode: '722' })
    .replace(/(.{4})/g, '$1 ')
    .trim()} «Kaspi Bank» АҚ, БСК CASPKZKA
Директор: ЖСН ${fake.iin()}, тел. 8 (701) 123-45-67`,
}

type Kind = 'taxid' | 'iban' | 'bic' | 'phone'

const OPERATORS = { kcell: 'Kcell', beeline: 'Beeline', 'tele2-altel': 'Tele2/Altel' } as const

interface Found {
  kind: Kind
  raw: string
  ok: boolean
  value: string
  details: string
}

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    input: 'Текст с реквизитами — из письма, счёта, договора',
    hint: 'Вставьте текст: найдутся ИИН/БИН, IBAN (ИИК), БИК и телефоны, каждый будет проверен.',
    none: 'В тексте не найдено ни одного номера.',
    found: (ok: number, all: number) => `Найдено: ${all}, корректных: ${ok}`,
    head: ['Что', 'Найдено', 'Проверка', 'Подробности'],
    kinds: { taxid: 'ИИН/БИН', iban: 'IBAN', bic: 'БИК', phone: 'Телефон' },
    iin: 'ИИН',
    bin: 'БИН',
    unknownBank: 'банк не найден в справочнике НБРК',
    json: 'Копировать JSON',
    messages: ru,
  },
  kk: {
    input: 'Деректемелері бар мәтін — хаттан, шоттан, шарттан',
    hint: 'Мәтінді қойыңыз: ЖСН/БСН, IBAN (ЖСК), БСК және телефондар табылып, әрқайсысы тексеріледі.',
    none: 'Мәтінде бірде-бір нөмір табылмады.',
    found: (ok: number, all: number) => `Табылды: ${all}, дұрысы: ${ok}`,
    head: ['Не', 'Табылғаны', 'Тексеру', 'Толығырақ'],
    kinds: { taxid: 'ЖСН/БСН', iban: 'IBAN', bic: 'БСК', phone: 'Телефон' },
    iin: 'ЖСН',
    bin: 'БСН',
    unknownBank: 'банк ҰБ анықтамалығында табылмады',
    json: 'JSON көшіру',
    messages: kk,
  },
}

type Texts = (typeof T)['ru' | 'kk']

// IBAN may be written in groups; phones in any of the usual +7/8 spellings.
const PATTERNS: [Kind, RegExp][] = [
  ['iban', /\bKZ\d{2}(?:[  ]?[0-9A-Z]){16}\b/gi],
  ['bic', /\b[A-Z]{4}KZ[A-Z0-9]{2}\b/g],
  ['taxid', /(?<![\d+])\d{12}(?!\d)/g],
  ['phone', /(?:\+7|\b8)[  \-(]*\d{3}[  \-)]*\d{3}[  -]*\d{2}[  -]*\d{2}\b/g],
]

const scan = (text: string, t: Texts, lang: 'ru' | 'kk'): Found[] => {
  const taken: [number, number][] = []
  const found: (Found & { at: number })[] = []
  for (const [kind, re] of PATTERNS)
    for (const m of text.matchAll(re)) {
      const at = m.index
      const end = at + m[0].length
      if (taken.some(([a, b]) => at < b && end > a)) continue
      taken.push([at, end])
      found.push({ at, ...check(kind, m[0], t, lang) })
    }
  return found.sort((a, b) => a.at - b.at)
}

const check = (kind: Kind, raw: string, t: Texts, lang: 'ru' | 'kk'): Found => {
  const bad = (error: string): Found => ({ kind, raw, ok: false, value: '', details: error })
  if (kind === 'taxid') {
    const r = parseTaxId(raw)
    if (!r.ok) return bad(t.messages.taxid[r.error])
    const v = r.value
    const details = v.kind === 'iin' ? [t.iin, v.birthDate].filter(Boolean).join(' · ') : t.bin
    return { kind, raw, ok: true, value: v.value, details }
  }
  if (kind === 'iban') {
    const r = parseIBAN(raw)
    if (!r.ok) return bad(t.messages.iban[r.error])
    const bank = r.value.bank
    return {
      kind,
      raw,
      ok: true,
      value: formatIBAN(r.value),
      details: bank ? `${bank.name[lang]} · ${bank.bic}` : t.unknownBank,
    }
  }
  if (kind === 'bic') {
    const bank = getBank(raw)
    return bank
      ? { kind, raw, ok: true, value: bank.bic, details: bank.name[lang] }
      : bad(t.unknownBank)
  }
  const r = parsePhone(raw)
  if (!r.ok) return bad(t.messages.phone[r.error])
  const v = r.value
  const details = v.originalOperator ? OPERATORS[v.originalOperator] : (v.city?.[lang] ?? '')
  return { kind, raw, ok: true, value: formatPhone(v), details }
}

export default function Requisites({ lang }: ToolProps) {
  const t = T[lang]
  const [text, setText] = useState(SAMPLE[lang])
  const found = useMemo(() => scan(text, t, lang), [text, t, lang])
  const valid = found.filter((f) => f.ok).length
  return (
    <>
      <label className="field wide batch__input">
        <span>{t.input}</span>
        <textarea
          rows={6}
          value={text}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {!text.trim() ? (
        <Status>{t.hint}</Status>
      ) : found.length === 0 ? (
        <Status>{t.none}</Status>
      ) : (
        <>
          <div className="bar">
            <Status ok={valid === found.length}>{t.found(valid, found.length)}</Status>
            <Copy
              text={() =>
                JSON.stringify(
                  found.map(({ kind, value, ok, details }) => ({ kind, value, ok, details })),
                  null,
                  2,
                )
              }
              lang={lang}
              label={t.json}
            />
          </div>
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
                {found.map((f) => (
                  <tr key={`${f.kind}${f.raw}`} className={f.ok ? undefined : 'bad'}>
                    <td>{t.kinds[f.kind]}</td>
                    <td>
                      <code>{f.ok ? f.value : f.raw}</code>
                    </td>
                    <td>{f.ok ? '✓' : '✕'}</td>
                    <td className="wrap">{f.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
