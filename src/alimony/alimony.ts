import { type DateInput, toDay } from '../core/date'
import type { AlimonyError } from '../core/errors'
import { err, ok, type Result } from '../core/result'
import { calculateSalary, getTaxYear, MAX_SALARY, type SalaryOptions } from '../tax/tax'
import { ALIMONY } from './generated'

export interface AlimonyOptions {
  /** Children: 1/4, 1/3, 1/2 of income (Marriage and Family Code art. 139); 0 — no share. Default 1, or 0 with `mrp`. */
  children?: number
  /** Share set by the court instead of the statutory one, percent (art. 139 p. 2). */
  percent?: number
  /** Fixed monthly sum in MRP (art. 141); added to the share when both are set. */
  mrp?: number
  /** `income` is gross salary: alimony is taken from the pay after ОПВ, ВОСМС and ИПН (Enforcement Law art. 94). */
  gross?: boolean
  /** Year of MRP and tax rates; default — the latest year in the data. */
  year?: number
  /** Passed to `calculateSalary` when `gross` is set. */
  salary?: Omit<SalaryOptions, 'year'>
}

export interface Alimony {
  /** Monthly income the alimony is taken from. */
  base: number
  /** Share of `base`, percent; 0 when alimony is a fixed sum only. */
  percent: number
  byShare: number
  /** Fixed part in tenge. */
  fixed: number
  /** Withheld: share + fixed, at most `100 − keepPercent` % of `base` (Enforcement Law art. 95). */
  amount: number
  /** True when the limit cut the amount; the rest becomes a debt. */
  capped: boolean
  /** Left to the payer. */
  kept: number
}

export interface AlimonyPenalty {
  /** Days from the day after `due` to `paid`, inclusive. */
  days: number
  /** 0.1 % of the debt per day (Marriage and Family Code art. 171). */
  penalty: number
}

const tiyn = (n: number) => Math.round(n * 100) / 100

const toNumber = (input: number | string): number =>
  typeof input === 'number'
    ? input
    : /^\d+(?:[.,]\d+)?$/.test(input.replace(/[\s ]/g, ''))
      ? Number(input.replace(/[\s ]/g, '').replace(',', '.'))
      : Number.NaN

const amount = (input: number | string): Result<number, AlimonyError> => {
  const n = toNumber(input)
  if (!Number.isFinite(n)) return err('invalid')
  return n < 0 || n > MAX_SALARY ? err('range') : ok(n)
}

/**
 * Monthly alimony for children withheld from income, with the 50 % deduction limit.
 * @example
 * alimony(500000, { children: 2, gross: true }).value // { base: 408975, percent: 33.33, amount: 136325, … }
 */
export const alimony = (
  income: number | string,
  options: AlimonyOptions = {},
): Result<Alimony, AlimonyError> => {
  const { mrp = 0, percent: custom, gross = false, year } = options
  const { children = mrp ? 0 : 1 } = options
  const i = amount(income)
  if (!i.ok) return i
  if (!Number.isInteger(children) || children < 0 || children > 100) return err('range')
  if (custom !== undefined && !(custom > 0 && custom <= 100)) return err('range')
  if (!(mrp >= 0 && mrp <= 1e6)) return err('range')
  const y = getTaxYear(year)
  if (!y) return err('data')
  let base = i.value
  if (gross) {
    const s = calculateSalary(i.value, { ...options.salary, year: y.year })
    if (!s.ok) return s
    base = s.value.net
  }
  const share = children ? ALIMONY.shares[Math.min(children, ALIMONY.shares.length) - 1] : undefined
  const ratio = custom !== undefined ? custom / 100 : share ? share[0] / share[1] : 0
  const byShare = tiyn(base * ratio)
  const fixed = tiyn(mrp * y.mrp)
  const limit = tiyn((base * (100 - ALIMONY.keepPercent)) / 100)
  const total = tiyn(byShare + fixed)
  const withheld = Math.min(total, limit)
  return ok({
    base,
    percent: Math.round(ratio * 1e4) / 100,
    byShare,
    fixed,
    amount: withheld,
    capped: total > limit,
    kept: tiyn(base - withheld),
  })
}

/**
 * Penalty for late alimony: 0.1 % of the unpaid sum per day of delay (Marriage and Family Code art. 171).
 * @example
 * alimonyPenalty(100000, '2026-01-31', '2026-03-02').value // { days: 30, penalty: 3000 }
 */
export const alimonyPenalty = (
  debt: number | string,
  due: DateInput,
  paid: DateInput,
): Result<AlimonyPenalty, AlimonyError> => {
  const d = amount(debt)
  if (!d.ok) return d
  const from = toDay(due)
  const to = toDay(paid)
  if (from === undefined || to === undefined) return err('date')
  const days = Math.max(0, to - from)
  return ok({ days, penalty: tiyn((d.value * ALIMONY.penaltyPercent * days) / 100) })
}
