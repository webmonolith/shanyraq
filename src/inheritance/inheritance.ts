import type { InheritanceError } from '../core/errors'
import { err, ok, type Result } from '../core/result'
import { INHERITANCE, ORDERS } from './generated'

export type Heir =
  | 'spouse'
  | 'children'
  | 'grandchildren'
  | 'parents'
  | 'siblings'
  | 'nephews'
  | 'grandparents'
  | 'unclesAunts'
  | 'cousins'
  | 'greatGrandparents'
  | 'fifth'
  | 'sixth'
  | 'seventh'
  | 'dependants'

export type Fraction = [numerator: number, denominator: number]

/** Heirs alive at the opening of the inheritance who accept it (Civil Code art. 1060–1068). */
export interface Heirs {
  /** Order 1. */
  spouse?: boolean
  children?: number
  /** Per child who died before the deceased: how many of their descendants take the share (art. 1067). */
  grandchildren?: number[]
  parents?: number
  /** Order 2: full and half siblings. */
  siblings?: number
  /** Per predeceased sibling: their children. */
  nephews?: number[]
  grandparents?: number
  /** Order 3. */
  unclesAunts?: number
  /** Per predeceased uncle or aunt: their children. */
  cousins?: number[]
  /** Order 4. */
  greatGrandparents?: number
  /** Order 5: relatives of the 4th degree (art. 1064 p. 2). */
  fifth?: number
  /** Order 6: relatives of the 5th degree. */
  sixth?: number
  /** Order 7: step-relatives who lived with the deceased for 10+ years (art. 1064 p. 3). */
  seventh?: number
  /** Disabled dependants: inherit equally with the called order, alone as order 8 (art. 1068). */
  dependants?: number
}

export interface InheritanceOptions {
  /** Own property of the deceased, tenge. */
  estate?: number | string
  /** Property acquired in marriage with the surviving spouse: half stays with the spouse (art. 1041, Family Code art. 38). */
  joint?: number | string
  /** Heirs of order 1 entitled to the obligatory share when there is a will (art. 1069): minor or disabled children, disabled spouse and parents. */
  obligatory?: { children?: number; spouse?: boolean; parents?: number }
}

export interface HeirShare {
  heir: Heir
  /** People in this line; each one gets `share`. */
  count: number
  /** Index of the predeceased heir whose share passes by representation. */
  branch?: number
  /** Share of the estate per person. */
  share: Fraction
  /** `share` of the estate, tenge. */
  amount: number
}

export interface Inheritance {
  /** Order called (1–8); 0 — no heirs, the estate escheats to the state (art. 1083). */
  order: number
  /** Estate: own property + the deceased's half of the joint property. */
  estate: number
  /** Spouse's own half of the joint property, not inherited. */
  marital: number
  heirs: HeirShare[]
  /** Per person: half of the intestate share, due regardless of the will. */
  obligatory: HeirShare[]
  /** Part of the estate a will can leave freely. */
  free: Fraction
}

const LIMIT = 1000
const MAX: Partial<Record<Heir, number>> = { parents: 2, grandparents: 4, greatGrandparents: 8 }

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
const frac = (n: number, d: number): Fraction => {
  const g = gcd(n, d) || 1
  return [n / g, d / g]
}
const tiyn = (n: number) => Math.round(n * 100) / 100

const money = (input: number | string | undefined): number | undefined => {
  if (input === undefined) return 0
  const s = typeof input === 'number' ? '' : input.replace(/[\s ]/g, '')
  const n =
    typeof input === 'number'
      ? input
      : /^\d+(?:[.,]\d+)?$/.test(s)
        ? Number(s.replace(',', '.'))
        : Number.NaN
  return Number.isFinite(n) ? n : undefined
}

const BRANCHES = new Set(ORDERS.flatMap((o) => (o.represented ? [o.represented] : [])))

const isCount = (n: unknown, max = LIMIT) =>
  Number.isInteger(n) && (n as number) >= 0 && (n as number) <= max

/**
 * Shares of heirs by law, the spouse's half of joint property and obligatory shares (Civil Code art. 1041, 1060–1069).
 * @example
 * inheritanceShares({ spouse: true, children: 2, grandchildren: [2] }, { estate: 40000000 }).value.heirs
 * // spouse 1/4, children 1/4 each, grandchildren 1/8 each — 10 000 000 and 5 000 000 ₸
 */
export const inheritanceShares = (
  heirs: Heirs,
  options: InheritanceOptions = {},
): Result<Inheritance, InheritanceError> => {
  const own = money(options.estate)
  const joint = money(options.joint)
  if (own === undefined || joint === undefined) return err('invalid')
  if (own < 0 || joint < 0 || own > 1e15 || joint > 1e15) return err('range')
  const counts: Partial<Record<Heir, number>> = {}
  const branches: Partial<Record<Heir, number[]>> = {}
  for (const [key, value] of Object.entries(heirs) as [Heir, unknown][]) {
    if (value === undefined) continue
    if (key === 'spouse') counts.spouse = value ? 1 : 0
    else if (BRANCHES.has(key)) {
      if (!Array.isArray(value) || value.length > LIMIT || !value.every((n) => isCount(n) && n > 0))
        return err('range')
      branches[key] = value
    } else if (isCount(value, MAX[key])) counts[key] = value as number
    else return err('range')
  }

  const [mn, md] = INHERITANCE.marital
  const marital = tiyn((joint * mn) / md)
  const estate = tiyn(own + joint - marital)
  const lines = (o: (typeof ORDERS)[number]) => {
    const list: [Heir, number][] = o.heirs.map((h) => [h, counts[h] ?? 0])
    if (o.order < 8) list.push(['dependants', counts.dependants ?? 0])
    return list.filter(([, n]) => n > 0)
  }
  const called = ORDERS.find(
    (o) => o.heirs.some((h) => counts[h]) || (o.represented && branches[o.represented]?.length),
  )
  const list = called ? lines(called) : []
  const by = called?.represented
  const represented = by ? (branches[by] ?? []) : []
  const units = list.reduce((s, [, n]) => s + n, 0) + represented.length
  const share = (heir: Heir, count: number, n: number, d: number, branch?: number): HeirShare => ({
    heir,
    count,
    ...(branch === undefined ? {} : { branch }),
    share: frac(n, d),
    amount: tiyn((estate * n) / d),
  })
  const result = [
    ...list.map(([h, n]) => share(h, n, 1, units)),
    ...represented.map((k, i) => share(by as Heir, k, 1, units * k, i)),
  ]

  const want = options.obligatory ?? {}
  const eligible: [Heir, number][] = [
    ['spouse', want.spouse ? 1 : 0],
    ['children', want.children ?? 0],
    ['parents', want.parents ?? 0],
  ]
  const [on, od] = INHERITANCE.obligatory
  const obligatory: HeirShare[] = []
  for (const [h, n] of eligible) {
    if (!isCount(n) || n > (called?.order === 1 ? (counts[h] ?? 0) : 0)) return err('range')
    if (n) obligatory.push(share(h, n, on, units * od))
  }
  const taken = obligatory.reduce((s, o) => s + o.count, 0)
  return ok({
    order: called?.order ?? 0,
    estate,
    marital,
    heirs: result,
    obligatory,
    free: units ? frac(units * od - taken * on, units * od) : [1, 1],
  })
}
