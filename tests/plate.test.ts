import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import data from '../data/plates.json'
import { isValidPlate, type PlateType, parsePlate } from '../src/plate'

const TYPES: Record<string, PlateType> = {
  individual: 'individual',
  legal_entity: 'legalEntity',
  motorcycle: 'motorcycle',
  trailer: 'trailer',
  transit: 'transit',
  police: 'police',
  state_guard: 'stateGuard',
  protocol: 'protocol',
  diplomatic: 'diplomatic',
  honorary_consul: 'honoraryConsul',
  foreign_company_branch: 'foreignBranch',
  foreign_participation_company: 'foreignParticipation',
  foreign_individual: 'foreigner',
  armenia_registered: 'armenia',
}

describe('parsePlate', () => {
  // Police trailers (5С) share the motorcycle format; they cannot be told apart by text.
  const samples = data.formats.filter((f) => !f.plateType.startsWith('Тип 5С'))

  it.each(samples.map((f) => [f.example, TYPES[f.ownerType]]))(
    'official sample %s → %s, canonical and strict-valid',
    (example, type) => {
      expect(parsePlate(example)).toMatchObject({ ok: true, value: { value: example, type } })
      expect(isValidPlate(example, { strict: true })).toBe(true)
    },
  )

  it('police trailer sample parses as motorcycle format', () => {
    expect(parsePlate('94 AA 01')).toMatchObject({ ok: true, value: { type: 'motorcycle' } })
  })

  it('every sample matches its data pattern', () => {
    for (const f of data.formats) expect(f.example).toMatch(new RegExp(f.pattern))
  })

  it('resolves the region', () => {
    expect(parsePlate('237 BLM 01')).toEqual({
      ok: true,
      value: { value: '237 BLM 01', type: 'individual', regionCode: '01', regionId: 'astana' },
    })
    expect(parsePlate('F 4445 17')).toMatchObject({ ok: true, value: { regionId: 'shymkent' } })
    expect(parsePlate('H 544')).toEqual({
      ok: true,
      value: { value: 'H 544', type: 'foreignParticipation' },
    })
    expect(parsePlate('3245 AN')).toEqual({
      ok: true,
      value: { value: '3245 AN', type: 'transit' },
    })
  })

  it.each([
    ['237blm01', '237 BLM 01'],
    ['237-BLM-01', '237 BLM 01'],
    [' 237  BLM  01 ', '237 BLM 01'],
    ['237 ВКМ 01', '237 BKM 01'],
    ['389 вк 01', '389 BK 01'],
    ['НС1234', 'HC1234'],
    ['М 123 456', 'M123 456'],
    ['Н 544 01', 'H 544 01'],
    ['d123456', 'D123 456'],
    ['protocol', 'PROTOCOL'],
  ])('lenient %j → %s', (input, value) => {
    expect(parsePlate(input)).toMatchObject({ ok: true, value: { value } })
  })

  it.each(['237blm01', '237  BLM 01', '237 ВКМ 01', 'D123456', 'НС1234'])(
    'strict rejects %j',
    (input) => {
      expect(parsePlate(input, { strict: true })).toEqual({ ok: false, error: 'format' })
    },
  )

  it.each([
    ['237 BLM 00', 'region'],
    ['237 BLM 21', 'region'],
    ['2494 99', 'region'],
    ['F 4445 21', 'region'],
    ['', 'format'],
    ['237 BL1 01', 'format'],
    ['2370 BLM 01', 'format'],
    ['A 123 BCD', 'format'],
    ['123 SKA', 'format'],
  ])('%j → %s', (input, error) => {
    expect(parsePlate(input)).toEqual({ ok: false, error })
  })

  it('rejects non-strings from untyped callers', () => {
    expect(parsePlate(undefined as unknown as string)).toEqual({ ok: false, error: 'format' })
  })

  it('canonical output parses back to itself in strict mode', () => {
    fc.assert(
      fc.property(
        fc.string({ unit: fc.constantFrom(...'0123456789ABDFHKMSTC '), maxLength: 10 }),
        (s) => {
          const r = parsePlate(s)
          return !r.ok || parsePlate(r.value.value, { strict: true }).ok
        },
      ),
      { numRuns: 10_000 },
    )
  })

  it('every DDD LLL RR with RR 01–20 is valid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999 }),
        fc.string({
          unit: fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
          minLength: 3,
          maxLength: 3,
        }),
        fc.integer({ min: 1, max: 20 }),
        (n, letters, region) =>
          isValidPlate(
            `${String(n).padStart(3, '0')} ${letters} ${String(region).padStart(2, '0')}`,
            {
              strict: true,
            },
          ),
      ),
      { numRuns: 10_000 },
    )
  })
})
