import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { isValidBIN, parseBIN } from '../src/bin'
import { corrupt, digitString, id, withCheck } from './helpers'

describe('parseBIN', () => {
  it('decodes all facets', () => {
    expect(parseBIN('180340021791')).toEqual({
      ok: true,
      value: {
        value: '180340021791',
        registered: { yy: 18, month: 3 },
        entityType: 'resident',
        divisionType: 'head',
        serial: '02179',
      },
    })
  })

  it.each([
    ['4', 'resident'],
    ['5', 'nonResident'],
    ['6', 'jointEntrepreneur'],
  ])('5th digit %s → %s', (digit, entityType) => {
    expect(parseBIN(id(`1803${digit}002179`), { strict: true })).toMatchObject({
      ok: true,
      value: { entityType },
    })
  })

  it('5th digit 0–3 is never a BIN', () => {
    for (const d of '0123')
      expect(parseBIN(id(`1803${d}002179`))).toEqual({ ok: false, error: 'entityType' })
  })

  it('reserved 5th digits 7–9: accepted, strict → entityType', () => {
    for (const d of '789') {
      const s = id(`1803${d}002179`)
      expect(parseBIN(s)).toMatchObject({ ok: true, value: { entityType: 'reserved' } })
      expect(parseBIN(s, { strict: true })).toEqual({ ok: false, error: 'entityType' })
    }
  })

  it.each([
    ['0', 'head'],
    ['1', 'branch'],
    ['2', 'representative'],
    ['3', 'farm'],
    ['4', 'farm'],
  ])('6th digit %s → %s', (digit, divisionType) => {
    expect(parseBIN(id(`18034${digit}02179`), { strict: true })).toMatchObject({
      ok: true,
      value: { divisionType },
    })
  })

  it('unknown 6th digits 5–9: no divisionType, strict → divisionType', () => {
    for (const d of '56789') {
      const r = parseBIN(id(`18034${d}02179`))
      expect(r.ok && r.value.divisionType).toBeUndefined()
      expect(parseBIN(id(`18034${d}02179`), { strict: true })).toEqual({
        ok: false,
        error: 'divisionType',
      })
    }
  })

  it('impossible month: no registered, strict → date', () => {
    for (const mm of ['00', '13', '99']) {
      const s = id(`18${mm}4002179`)
      const r = parseBIN(s)
      expect(r.ok && r.value.registered).toBeUndefined()
      expect(parseBIN(s, { strict: true })).toEqual({ ok: false, error: 'date' })
    }
  })

  it.each([
    ['180340 021791', true],
    ['1803-4002-1791', true],
  ])('separators %j', (input, ok) => {
    expect(parseBIN(input).ok).toBe(ok)
    expect(parseBIN(input, { strict: true })).toEqual({ ok: false, error: 'format' })
  })

  it.each([
    ['18034002179', 'length'],
    ['18034002179x', 'format'],
    ['180340021792', 'checksum'],
  ])('%j → %s', (input, error) => {
    expect(parseBIN(input)).toEqual({ ok: false, error })
  })

  it('never accepts a decodable IIN', () => {
    expect(isValidBIN('900101300126')).toBe(false)
  })
})

describe('isValidBIN', () => {
  it('matches the 5th-digit rule for any checksummed number', () => {
    fc.assert(
      fc.property(digitString(11), (body) => {
        const s = withCheck(body)
        return s === null || isValidBIN(s) === s.charCodeAt(4) > 51
      }),
      { numRuns: 10_000 },
    )
  })

  it('rejects any wrong check digit', () => {
    fc.assert(
      fc.property(digitString(11), (body) => {
        const s = withCheck(body)
        return s === null || !isValidBIN(corrupt(s))
      }),
    )
  })
})
