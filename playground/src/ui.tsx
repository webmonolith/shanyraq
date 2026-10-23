import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ClaimPayment } from 'shanyraq/claim'
import { track } from './analytics'
import type { Lang } from './site'

/** `1 234 567,50` with no-break spaces; identical on server and client, unlike toLocaleString. */
export const fmt = (n: number, digits = 0): string => {
  const [int, frac] = n.toFixed(digits).split('.')
  return (int as string).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + (frac ? `,${frac}` : '')
}

export interface ToolProps {
  lang: Lang
}

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'decimal'
  type?: 'text' | 'date' | 'month' | 'number'
  wide?: boolean
}

const SPACES = /[\s\u00a0]/g

/** Groups the integer part of a typed number: `1000000,5` → `1 000 000,5`. */
const group = (v: string) =>
  v.replace(/^\d+/, (int) => int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'))

// Restores the caret after regrouping, counted in non-space characters.
const caretAt = (text: string, count: number) => {
  let i = 0
  for (let n = 0; i < text.length && n < count; i++) if (!/[\s\u00a0]/.test(text[i] as string)) n++
  return i
}

/** Decimal fields show digit groups; `onChange` always gets the value without spaces. */
export const Field = ({ label, onChange, wide, type = 'text', value, ...rest }: FieldProps) => {
  const grouped = rest.inputMode === 'decimal'
  const input = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  const shown = grouped ? group(value.replace(SPACES, '')) : value
  useLayoutEffect(() => {
    const el = input.current
    if (!el || caret.current === null || document.activeElement !== el) return
    const at = caretAt(shown, caret.current)
    el.setSelectionRange(at, at)
    caret.current = null
  })
  return (
    <label className={wide ? 'field wide' : 'field'}>
      <span>{label}</span>
      <input
        {...rest}
        ref={input}
        value={shown}
        type={type}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        onChange={(e) => {
          if (!grouped) return onChange(e.target.value)
          const el = e.target
          caret.current = el.value
            .slice(0, el.selectionStart ?? el.value.length)
            .replace(SPACES, '').length
          onChange(el.value.replace(SPACES, ''))
        }}
      />
    </label>
  )
}

export const Check = ({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) => (
  <label className="check">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    {label}
  </label>
)

export const Choice = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (value: T) => void
}) => (
  <label className="field">
    <span>{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map(([v, text]) => (
        <option key={v} value={v}>
          {text}
        </option>
      ))}
    </select>
  </label>
)

/** Verdict line; `ok: undefined` is the neutral hint shown for empty input. */
export const Status = ({ ok, children }: { ok?: boolean | undefined; children: ReactNode }) => (
  <p className={ok === undefined ? 'status' : ok ? 'status ok' : 'status bad'} role="status">
    {children}
  </p>
)

const fragment = () => new URLSearchParams(location.hash.slice(1))

/**
 * Input state mirrored in `#<key>=` so a result can be shared by link. The fragment never reaches the server,
 * its logs or analytics (a `?query` does: GA site search reads `q`). Starts from `initial` on both server and
 * client; the URL is read after hydration.
 */
export const useQuery = (key: string, initial = ''): [string, (value: string) => void] => {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    const q = fragment().get(key)
    if (q !== null) setValue(q)
  }, [key])
  const set = (v: string) => {
    setValue(v)
    const params = fragment()
    if (v) params.set(key, v)
    else params.delete(key)
    const hash = params.toString()
    history.replaceState(history.state, '', `${location.pathname}${hash && `#${hash}`}`)
  }
  return [value, set]
}

const Row = ({ k, v, lang }: { k: string; v: ReactNode; lang: Lang | undefined }) => {
  const dd = useRef<HTMLElement>(null)
  return (
    <div>
      <dt>{k}</dt>
      <dd ref={dd}>{v}</dd>
      {lang && <Copy text={() => dd.current?.textContent ?? ''} lang={lang} icon />}
    </div>
  )
}

/** Label–value list; with `lang` every row gets a copy button. */
export const Rows = ({ rows, lang }: { rows: [string, ReactNode][]; lang?: Lang }) => (
  <dl className={lang ? 'rows rows--copy' : 'rows'}>
    {rows.map(([k, v]) => (
      <Row key={k} k={k} v={v} lang={lang} />
    ))}
  </dl>
)

const COPY = { ru: ['Копировать', 'Скопировано'], kk: ['Көшіру', 'Көшірілді'] } as const

const CopyIcon = ({ done }: { done: boolean }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    {done ? (
      <path d="M3 8.5 6.5 12 13 4.5" />
    ) : (
      <>
        <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
        <path d="M10.5 3.5V3A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" />
      </>
    )}
  </svg>
)

export const Copy = ({
  text,
  lang,
  label,
  icon,
  event = 'copy',
}: {
  text: string | (() => string)
  lang: Lang
  label?: string
  /** Icon-only button; the label goes to aria-label/title. */
  icon?: boolean
  /** Analytics event name; never carries the copied text. */
  event?: string
}) => {
  const [done, setDone] = useState(false)
  const caption = done ? COPY[lang][1] : (label ?? COPY[lang][0])
  return (
    <button
      type="button"
      className={icon ? 'ghost icon' : 'ghost'}
      aria-label={icon ? caption : undefined}
      title={icon ? caption : undefined}
      onClick={() =>
        navigator.clipboard.writeText(typeof text === 'string' ? text : text()).then(() => {
          track(event)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        })
      }
    >
      {icon ? <CopyIcon done={done} /> : caption}
    </button>
  )
}

const SHARE = { ru: 'Ссылка на результат', kk: 'Нәтижеге сілтеме' }

/** Copies the current URL, which carries the input via `useQuery`. */
export const Share = ({ lang }: { lang: Lang }) => (
  <Copy text={() => location.href} lang={lang} label={SHARE[lang]} event="share" />
)

export const Output = ({ text, lang }: { text: string; lang: Lang }) => (
  <div className="output">
    <output>{text}</output>
    <Copy text={text} lang={lang} />
  </div>
)

export const dmy = (iso: string) => iso.split('-').reverse().join('.')
export const num = (s: string) => Number(s.replace(/[\s ]/g, '').replace(',', '.'))

/** Lines like `10.06.2026 400 000` or `2026-06-10; 400000`; returns the bad line number on failure. */
export const parsePayments = (text: string): ClaimPayment[] | number => {
  const out: ClaimPayment[] = []
  const lines = text.split('\n')
  for (const [i, line] of lines.entries()) {
    if (!line.trim()) continue
    const m =
      /^\s*(?:(\d{4}-\d{2}-\d{2})|(\d{2})\.(\d{2})\.(\d{4}))[\s;,\t]+(\d{1,3}(?:[\s ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)\s*$/.exec(
        line,
      )
    if (!m) return i + 1
    out.push({
      date: m[1] ?? `${m[4]}-${m[3]}-${m[2]}`,
      amount: (m[5] as string).replace(/[\s ]/g, ''),
    })
  }
  return out
}
