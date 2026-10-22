import type { DivisionType, EntityType } from '../bin/bin'
import { checkDigit } from '../core/checksum'
import { daysInMonth } from '../core/id'
import { ACTIVE_CODES } from '../iban/generated'
import { ibanCheckDigits } from '../iban/iban'
import type { Gender } from '../iin/iin'
import { LANDLINE, MOBILE } from '../phone/generated'
import { BY_PLATE_CODE } from '../regions/generated'

export interface FakeIINOptions {
  gender?: Gender
  /** Birth year range, clamped to 1800–2099; default 1950–2010. */
  minYear?: number
  maxYear?: number
}

export interface FakeBINOptions {
  entityType?: Exclude<EntityType, 'reserved'>
  divisionType?: DivisionType
}

export interface FakePhoneOptions {
  /** Default `mobile`. */
  type?: 'mobile' | 'landline'
}

export interface FakeIBANOptions {
  /** 3-digit bank code; default a random active bank. */
  bankCode?: string
}

export interface FakePlateOptions {
  /** Default `individual` (`237 BLM 01`); `legalEntity` gives `389 BK 01`. */
  type?: 'individual' | 'legalEntity'
}

export interface FakeAmountOptions {
  /** Tenge, default 0. */
  min?: number
  /** Tenge, default 1 000 000. */
  max?: number
}

export interface Faker {
  /** Seed the generator was created with. */
  seed: number
  /** Float in [0, 1). */
  next(): number
  /** Integer in [min, max]. */
  int(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  iin(options?: FakeIINOptions): string
  bin(options?: FakeBINOptions): string
  taxId(): string
  phone(options?: FakePhoneOptions): string
  iban(options?: FakeIBANOptions): string
  plate(options?: FakePlateOptions): string
  amount(options?: FakeAmountOptions): number
}

const ENTITY: Record<Exclude<EntityType, 'reserved'>, string> = {
  resident: '4',
  nonResident: '5',
  jointEntrepreneur: '6',
}

const DIVISION: Record<DivisionType, string> = {
  head: '0',
  branch: '1',
  representative: '2',
  farm: '4',
}

const MOBILE_CODES = Object.keys(MOBILE)
// Account characters allowed by NBRK: digits and Latin letters except I, O, Q.
const ACCOUNT_CHARS = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ'
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const pad = (n: number, width: number): string => String(n).padStart(width, '0')

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

// mulberry32: tiny, fast, good enough for test data; not cryptographic.
const mulberry32 = (seed: number) => {
  let state = seed
  return (): number => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), state | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Deterministic generator of valid test data: the same seed gives the same sequence.
 * @example
 * const fake = createFaker(42)
 * fake.iin({ gender: 'female' }) // '…' passes isValidIIN(…, { strict: true })
 */
export const createFaker = (seed: number = Math.floor(Math.random() * 2 ** 32)): Faker => {
  const next = mulberry32(seed >>> 0)
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)] as T
  const digits = (n: number) => pad(int(0, 10 ** n - 1), n)

  const withCheckDigit = (make: () => string): string => {
    for (;;) {
      const body = make()
      const check = checkDigit(body)
      if (check !== null) return body + check
    }
  }

  const iin = (options: FakeIINOptions = {}) => {
    const lo = clamp(options.minYear ?? 1950, 1800, 2099)
    const hi = clamp(options.maxYear ?? 2010, lo, 2099)
    return withCheckDigit(() => {
      const year = int(lo, hi)
      const month = int(1, 12)
      const day = int(1, daysInMonth(year, month))
      const gender = options.gender ?? pick<Gender>(['male', 'female'])
      const centuryDigit = Math.floor(year / 100 - 18) * 2 + (gender === 'male' ? 1 : 2)
      return `${pad(year % 100, 2)}${pad(month, 2)}${pad(day, 2)}${centuryDigit}${digits(4)}`
    })
  }

  const bin = (options: FakeBINOptions = {}) =>
    withCheckDigit(() => {
      const entity =
        ENTITY[
          options.entityType ?? pick(['resident', 'nonResident', 'jointEntrepreneur'] as const)
        ]
      const division =
        DIVISION[
          options.divisionType ?? pick(['head', 'branch', 'representative', 'farm'] as const)
        ]
      return `${pad(int(1991, 2025) % 100, 2)}${pad(int(1, 12), 2)}${entity}${division}${digits(5)}`
    })

  const phone = (options: FakePhoneOptions = {}) => {
    if (options.type !== 'landline') return `+7${pick(MOBILE_CODES)}${digits(7)}`
    const [area, next] = pick(LANDLINE)
    const first = next ? (next[int(0, next.length - 1)] as string) : ''
    return `+7${area}${first}${digits(10 - area.length - first.length)}`
  }

  const chars = (alphabet: string, n: number) => {
    let s = ''
    for (let i = 0; i < n; i++) s += alphabet[int(0, alphabet.length - 1)]
    return s
  }

  const iban = (options: FakeIBANOptions = {}) => {
    const bban = (options.bankCode ?? pick(ACTIVE_CODES)) + chars(ACCOUNT_CHARS, 13)
    return `KZ${ibanCheckDigits(bban)}${bban}`
  }

  const plate = (options: FakePlateOptions = {}) =>
    `${digits(3)} ${chars(LETTERS, options.type === 'legalEntity' ? 2 : 3)} ${pad(int(1, BY_PLATE_CODE.length), 2)}`

  const amount = (options: FakeAmountOptions = {}) =>
    int(Math.round((options.min ?? 0) * 100), Math.round((options.max ?? 1_000_000) * 100)) / 100

  return {
    seed,
    next,
    int,
    pick,
    iin,
    bin,
    taxId: () => (next() < 0.5 ? iin() : bin()),
    phone,
    iban,
    plate,
    amount,
  }
}
