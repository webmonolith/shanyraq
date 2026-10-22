import { type ReactNode, useEffect, useRef, useState } from 'react'
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
  type?: 'text' | 'date' | 'number'
  wide?: boolean
}

export const Field = ({ label, onChange, wide, type = 'text', ...rest }: FieldProps) => (
  <label className={wide ? 'field wide' : 'field'}>
    <span>{label}</span>
    <input
      {...rest}
      type={type}
      autoComplete="off"
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
)

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

/**
 * Input state mirrored in `?<key>=` so a result can be shared by link.
 * Starts from `initial` on both server and client; the URL is read after hydration.
 */
export const useQuery = (key: string, initial = ''): [string, (value: string) => void] => {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    const q = new URLSearchParams(location.search).get(key)
    if (q !== null) setValue(q)
  }, [key])
  const set = (v: string) => {
    setValue(v)
    const url = new URL(location.href)
    if (v) url.searchParams.set(key, v)
    else url.searchParams.delete(key)
    history.replaceState(history.state, '', url)
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
}: {
  text: string | (() => string)
  lang: Lang
  label?: string
  /** Icon-only button; the label goes to aria-label/title. */
  icon?: boolean
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
  <Copy text={() => location.href} lang={lang} label={SHARE[lang]} />
)

export const Output = ({ text, lang }: { text: string; lang: Lang }) => (
  <div className="output">
    <output>{text}</output>
    <Copy text={text} lang={lang} />
  </div>
)
