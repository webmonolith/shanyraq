import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { isValidBIN, parseBIN } from '../src/bin'
import { createFaker } from '../src/faker'
import { isValidIBAN, parseIBAN } from '../src/iban'
import { isValidIIN, parseIIN } from '../src/iin'
import { isValidAmount } from '../src/money'
import { isValidPhone, parsePhone } from '../src/phone'
import { parsePlate } from '../src/plate'
import { isValidTaxId } from '../src/taxid'

const strict = { strict: true }
const seeds = fc.integer({ min: 0, max: 2 ** 32 - 1 })
const runs = { numRuns: 10_000 }

describe('createFaker', () => {
  it('is deterministic per seed', () => {
    const a = createFaker(42)
    const b = createFaker(42)
    const seq = (f: typeof a) => [
      f.iin(),
      f.bin(),
      f.taxId(),
      f.phone(),
      f.iban(),
      f.plate(),
      f.amount(),
      f.next(),
    ]
    expect(seq(a)).toEqual(seq(b))
    expect(seq(createFaker(43))).not.toEqual(seq(createFaker(42)))
    expect(a.seed).toBe(42)
  })

  it('picks a random seed when none is given', () => {
    const f = createFaker()
    expect(Number.isInteger(f.seed)).toBe(true)
    expect(createFaker(f.seed).iin()).toBe(f.iin())
  })

  it('next, int and pick stay in range', () => {
    const f = createFaker(1)
    for (let i = 0; i < 1000; i++) {
      const x = f.next()
      expect(x >= 0 && x < 1).toBe(true)
      const n = f.int(-3, 3)
      expect(Number.isInteger(n) && n >= -3 && n <= 3).toBe(true)
      expect(['a', 'b']).toContain(f.pick(['a', 'b']))
    }
  })
})

describe('faker output passes every validator (strict)', () => {
  it('iin', () => {
    fc.assert(
      fc.property(seeds, (seed) => isValidIIN(createFaker(seed).iin(), strict)),
      runs,
    )
  })

  it('bin', () => {
    fc.assert(
      fc.property(seeds, (seed) => isValidBIN(createFaker(seed).bin(), strict)),
      runs,
    )
  })

  it('taxId', () => {
    fc.assert(
      fc.property(seeds, (seed) => isValidTaxId(createFaker(seed).taxId(), strict)),
      runs,
    )
  })

  it('phone: mobile and landline', () => {
    fc.assert(
      fc.property(
        seeds,
        fc.constantFrom('mobile', 'landline') as fc.Arbitrary<'mobile'>,
        (seed, type) => {
          const p = parsePhone(createFaker(seed).phone({ type }), strict)
          return p.ok && p.value.type === type
        },
      ),
      runs,
    )
  })

  it('iban', () => {
    fc.assert(
      fc.property(seeds, (seed) => isValidIBAN(createFaker(seed).iban(), strict)),
      runs,
    )
  })

  it('plate: individual and legal entity', () => {
    fc.assert(
      fc.property(
        seeds,
        fc.constantFrom('individual', 'legalEntity') as fc.Arbitrary<'individual'>,
        (seed, type) => {
          const p = parsePlate(createFaker(seed).plate({ type }), strict)
          return p.ok && p.value.type === type
        },
      ),
      runs,
    )
  })

  it('amount', () => {
    fc.assert(
      fc.property(seeds, (seed) => {
        const a = createFaker(seed).amount({ min: 10, max: 20 })
        return isValidAmount(a) && a >= 10 && a <= 20 && Math.round(a * 100) / 100 === a
      }),
      runs,
    )
  })
})

describe('faker options', () => {
  it('iin: gender and year range', () => {
    const f = createFaker(7)
    for (let i = 0; i < 200; i++) {
      const r = parseIIN(f.iin({ gender: 'female', minYear: 2001, maxYear: 2003 }))
      expect(r.ok && r.value.gender).toBe('female')
      const year = r.ok ? Number(r.value.birthDate?.slice(0, 4)) : 0
      expect(year >= 2001 && year <= 2003).toBe(true)
    }
  })

  it('iin: years are clamped to the encodable 1800–2099', () => {
    const f = createFaker(8)
    const year = (o: object) => {
      const r = parseIIN(f.iin(o))
      return r.ok ? r.value.birthDate?.slice(0, 4) : undefined
    }
    expect(year({ minYear: 1000, maxYear: 1000 })).toBe('1800')
    expect(year({ minYear: 3000, maxYear: 3000 })).toBe('2099')
    expect(year({ minYear: 2000, maxYear: 1990 })).toBe('2000')
  })

  it('bin: entity and division type', () => {
    const f = createFaker(9)
    for (let i = 0; i < 100; i++) {
      const r = parseBIN(f.bin({ entityType: 'nonResident', divisionType: 'farm' }), strict)
      expect(r.ok && [r.value.entityType, r.value.divisionType]).toEqual(['nonResident', 'farm'])
    }
  })

  it('phone: mobile by default', () => {
    expect(isValidPhone(createFaker(3).phone(), strict)).toBe(true)
    expect(parsePhone(createFaker(3).phone())).toMatchObject({
      ok: true,
      value: { type: 'mobile' },
    })
  })

  it('iban: bank code', () => {
    const f = createFaker(11)
    for (let i = 0; i < 100; i++) {
      const r = parseIBAN(f.iban({ bankCode: '722' }), strict)
      expect(r.ok && r.value.bank?.bic).toBe('CASPKZKA')
    }
  })

  it('plate: individual by default', () => {
    expect(parsePlate(createFaker(4).plate())).toMatchObject({
      ok: true,
      value: { type: 'individual' },
    })
  })
})
