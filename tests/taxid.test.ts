import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { isValidBIN } from '../src/bin'
import { isValidIIN } from '../src/iin'
import { isValidTaxId, parseTaxId } from '../src/taxid'
import { digitString, id, withCheck } from './helpers'

describe('parseTaxId', () => {
  it('tells an IIN from a BIN by the 5th digit', () => {
    expect(parseTaxId('900101300126')).toMatchObject({
      ok: true,
      value: { kind: 'iin', birthDate: '1990-01-01' },
    })
    expect(parseTaxId('180340021791')).toMatchObject({
      ok: true,
      value: { kind: 'bin', entityType: 'resident' },
    })
  })

  it.each([
    ['9001013001', 'length'],
    ['90010130012O', 'format'],
    ['900101300125', 'checksum'],
    ['900101 300126', 'format', true],
  ])('%j → %s', (input, error, strict = false) => {
    expect(parseTaxId(input, { strict })).toEqual({ ok: false, error })
  })

  it('strict: kind when neither structure fits', () => {
    expect(parseTaxId(id('90010170001'), { strict: true })).toEqual({ ok: false, error: 'kind' })
    expect(parseTaxId(id('18037002179'), { strict: true })).toEqual({ ok: false, error: 'kind' })
    expect(parseTaxId(id('90010170001'))).toMatchObject({ ok: true, value: { kind: 'iin' } })
  })

  it('agrees with isValidIIN || isValidBIN', () => {
    fc.assert(
      fc.property(digitString(11), fc.boolean(), (body, strict) => {
        const s = withCheck(body) ?? `${body}0`
        const o = { strict }
        return isValidTaxId(s, o) === (isValidIIN(s, o) || isValidBIN(s, o))
      }),
      { numRuns: 10_000 },
    )
  })
})
