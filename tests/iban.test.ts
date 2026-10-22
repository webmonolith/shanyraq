import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import banks from '../data/banks.json'
import {
  formatIBAN,
  getBank,
  type IBANInfo,
  ibanCheckDigits,
  isValidIBAN,
  parseIBAN,
} from '../src/iban'

const info = (input: string, strict = false): IBANInfo => {
  const r = parseIBAN(input, { strict })
  if (!r.ok) throw new Error(`${input}: ${r.error}`)
  return r.value
}

const ACCOUNT = fc.string({
  unit: fc.constantFrom(...'0123456789ABCDEFGHJKLMNPRSTUVWXYZ'),
  minLength: 13,
  maxLength: 13,
})

describe('parseIBAN', () => {
  it.each(banks.iban.checkDigits.examples.map((e) => e.iban))('official example %s', (iban) => {
    expect(isValidIBAN(iban)).toBe(true)
  })

  it('splits into check digits, bank code and account; resolves the bank', () => {
    expect(info('KZ86125KZT5004100100')).toEqual({
      value: 'KZ86125KZT5004100100',
      checkDigits: '86',
      bankCode: '125',
      account: 'KZT5004100100',
      bank: {
        code: '125',
        bic: 'NBRKKZKX',
        name: {
          ru: 'РГУ Национальный Банк Республики Казахстан',
          kk: 'Қазақстан Республикасының Ұлттық Банкі РММ',
          en: 'RSI "The National Bank of the Republic of Kazakhstan"',
        },
        active: true,
      },
    })
  })

  it.each([
    'KZ86 125K ZT50 0410 0100',
    'kz86125kzt5004100100',
    ' KZ86-125K-ZT50-0410-0100 ',
    'KZ86 125K ZT50 0410 0100',
  ])('lenient normalizes %j', (input) => {
    expect(info(input).value).toBe('KZ86125KZT5004100100')
  })

  it.each([
    ['KZ86 125K ZT50 0410 0100', 'format'],
    ['kz86125kzt5004100100', 'format'],
  ])('strict rejects %j', (input, error) => {
    expect(parseIBAN(input, { strict: true })).toEqual({ ok: false, error })
  })

  it.each([
    ['', 'length'],
    ['KZ86125KZT500410010', 'length'],
    ['KZ86125KZT50041001000', 'length'],
    ['KZ86125KZT50041001_0', 'format'],
    ['KZ86125KZТ5004100100', 'format'],
    ['DE86125KZT5004100100', 'country'],
    ['KZ8A125KZT5004100100', 'format'],
    ['KZ86A25KZT5004100100', 'format'],
    ['KZ87125KZT5004100100', 'checksum'],
    ['KZ86125KZT5004100101', 'checksum'],
  ])('%j → %s', (input, error) => {
    expect(parseIBAN(input)).toEqual({ ok: false, error })
  })

  it('unknown and inactive banks pass in lenient mode only', () => {
    const unknown = `KZ${ibanCheckDigits('1110000000000000')}1110000000000000`
    expect(info(unknown).bank).toBeUndefined()
    expect(parseIBAN(unknown, { strict: true })).toEqual({ ok: false, error: 'bank' })
    const alfa = `KZ${ibanCheckDigits('9470000000000000')}9470000000000000`
    expect(info(alfa).bank).toMatchObject({ bic: 'ALFAKZKA', active: false })
    expect(parseIBAN(alfa, { strict: true })).toEqual({ ok: false, error: 'bank' })
  })

  it('strict rejects I, O, Q in the account', () => {
    for (const letter of 'IOQ') {
      const bban = `722${letter}000000000000`
      const iban = `KZ${ibanCheckDigits(bban)}${bban}`
      expect(isValidIBAN(iban)).toBe(true)
      expect(parseIBAN(iban, { strict: true })).toEqual({ ok: false, error: 'format' })
    }
  })

  it('check digits 00, 01 and 99 are never valid', () => {
    const bban = '998K5DF3FHPFBHY8'
    expect(ibanCheckDigits(bban)).toBe('98')
    expect(isValidIBAN(`KZ98${bban}`)).toBe(true)
    expect(parseIBAN(`KZ01${bban}`)).toEqual({ ok: false, error: 'checksum' })
    for (const cd of ['00', '99'])
      for (let n = 0; n < 50; n++) {
        const b = `722${String(n).padStart(13, '0')}`
        expect(isValidIBAN(`KZ${cd}${b}`)).toBe(false)
      }
  })

  it('rejects non-strings from untyped callers', () => {
    expect(parseIBAN(42 as unknown as string)).toEqual({ ok: false, error: 'format' })
  })

  it('any body with computed check digits is valid; any other check digits are not', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...banks.banks.filter((b) => b.active).map((b) => b.code)),
        ACCOUNT,
        fc.integer({ min: 0, max: 99 }),
        (code, account, cd) => {
          const check = ibanCheckDigits(code + account)
          const candidate = `KZ${String(cd).padStart(2, '0')}${code}${account}`
          return isValidIBAN(candidate, { strict: true }) === (candidate.slice(2, 4) === check)
        },
      ),
      { numRuns: 10_000 },
    )
  })

  it('any single character change breaks the checksum', () => {
    fc.assert(
      fc.property(
        ACCOUNT,
        fc.integer({ min: 4, max: 19 }),
        fc.integer({ min: 1, max: 9 }),
        (account, pos, delta) => {
          const bban = `722${account}`
          const iban = `KZ${ibanCheckDigits(bban)}${bban}`
          const ch = iban[pos] as string
          const changed = /\d/.test(ch)
            ? String((Number(ch) + delta) % 10)
            : String.fromCharCode(65 + ((ch.charCodeAt(0) - 65 + delta) % 26))
          const r = parseIBAN(iban.slice(0, pos) + changed + iban.slice(pos + 1))
          return !r.ok
        },
      ),
      { numRuns: 10_000 },
    )
  })
})

describe('formatIBAN', () => {
  it('groups by 4 and parses back', () => {
    expect(formatIBAN(info('KZ86125KZT5004100100'))).toBe('KZ86 125K ZT50 0410 0100')
    fc.assert(
      fc.property(ACCOUNT, (account) => {
        const bban = `601${account}`
        const parsed = info(`KZ${ibanCheckDigits(bban)}${bban}`)
        return info(formatIBAN(parsed)).value === parsed.value
      }),
    )
  })
})

describe('getBank', () => {
  it('by code and by BIC', () => {
    expect(getBank('722')).toMatchObject({ bic: 'CASPKZKA', active: true })
    expect(getBank('HSBKKZKX')?.code).toBe('601')
    expect(getBank('000')).toBeUndefined()
  })

  it('a reassigned code resolves to its active holder; the old BIC still resolves', () => {
    expect(getBank('914')).toMatchObject({ bic: 'BRKEKZKA', active: true })
    expect(getBank('SABRKZKA')).toMatchObject({ code: '914', active: false })
    expect(getBank('998')?.bic).toBe('TSESKZKA')
  })
})
