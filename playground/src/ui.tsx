import { type ReactNode, useState } from 'react'
import type { Lang } from './site'

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
export const Status = ({ ok, children }: { ok?: boolean; children: ReactNode }) => (
  <p className={ok === undefined ? 'status' : ok ? 'status ok' : 'status bad'} role="status">
    {children}
  </p>
)

export const Rows = ({ rows }: { rows: [string, ReactNode][] }) => (
  <dl className="rows">
    {rows.map(([k, v]) => (
      <div key={k}>
        <dt>{k}</dt>
        <dd>{v}</dd>
      </div>
    ))}
  </dl>
)

const COPY = { ru: ['Копировать', 'Скопировано'], kk: ['Көшіру', 'Көшірілді'] } as const

export const Copy = ({ text, lang, label }: { text: string; lang: Lang; label?: string }) => {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="ghost"
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        })
      }
    >
      {done ? COPY[lang][1] : (label ?? COPY[lang][0])}
    </button>
  )
}

export const Output = ({ text, lang }: { text: string; lang: Lang }) => (
  <div className="output">
    <output>{text}</output>
    <Copy text={text} lang={lang} />
  </div>
)
