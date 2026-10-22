import { useState } from 'react'
import { createFaker } from 'shanyraq/faker'
import { Copy, Field, Status, type ToolProps } from '../ui'

const COLUMNS = ['iin', 'bin', 'phone', 'iban', 'plate', 'amount'] as const

const T = {
  ru: {
    seed: 'Seed (одинаковый seed — одинаковые данные)',
    count: 'Строк',
    random: 'Случайный seed',
    csv: 'Копировать CSV',
    json: 'Копировать JSON',
    shown: (n: number) => `Показаны первые 50 строк; CSV и JSON содержат все ${n}.`,
    head: ['ИИН', 'БИН', 'Телефон', 'IBAN', 'Госномер', 'Сумма'],
  },
  kk: {
    seed: 'Seed (бірдей seed — бірдей деректер)',
    count: 'Жолдар',
    random: 'Кездейсоқ seed',
    csv: 'CSV көшіру',
    json: 'JSON көшіру',
    shown: (n: number) => `Алғашқы 50 жол көрсетілген; CSV мен JSON-да барлық ${n} жол бар.`,
    head: ['ЖСН', 'БСН', 'Телефон', 'IBAN', 'Мемл. нөмір', 'Сома'],
  },
}

type Row = Record<(typeof COLUMNS)[number], string | number>

const generate = (seed: number, count: number): Row[] => {
  const f = createFaker(seed)
  return Array.from({ length: count }, () => ({
    iin: f.iin(),
    bin: f.bin(),
    phone: f.phone(),
    iban: f.iban(),
    plate: f.plate(),
    amount: f.amount(),
  }))
}

export default function Faker({ lang }: ToolProps) {
  const t = T[lang]
  const [seed, setSeed] = useState('42')
  const [count, setCount] = useState('10')
  const n = Math.min(1000, Math.max(1, Math.trunc(Number(count)) || 1))
  const rows = generate(Number(seed) >>> 0, n)
  const csv = [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => r[c]).join(','))].join('\n')
  return (
    <>
      <div className="grid">
        <Field label={t.seed} value={seed} onChange={setSeed} inputMode="numeric" />
        <Field
          label={t.count}
          value={count}
          onChange={setCount}
          type="number"
          inputMode="numeric"
        />
      </div>
      <div className="bar">
        <button
          type="button"
          className="ghost"
          onClick={() => setSeed(String(Math.floor(Math.random() * 2 ** 32)))}
        >
          {t.random}
        </button>
        <Copy text={csv} lang={lang} label={t.csv} />
        <Copy text={JSON.stringify(rows, null, 2)} lang={lang} label={t.json} />
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
            {rows.slice(0, 50).map((r) => (
              <tr key={r.iin}>
                {COLUMNS.map((c) => (
                  <td key={c}>{r[c]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {n > 50 && <Status>{t.shown(n)}</Status>}
    </>
  )
}
