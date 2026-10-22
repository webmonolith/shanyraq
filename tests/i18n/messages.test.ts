import { describe, expect, it } from 'vitest'
import { en, getMessage, kk, messages, ru } from '../../src/i18n'

const shape = (m: object) =>
  Object.entries(m).map(([module, codes]) => [module, Object.keys(codes).sort()])

describe('messages', () => {
  it('every language covers the same modules and codes', () => {
    expect(shape(kk)).toEqual(shape(ru))
    expect(shape(en)).toEqual(shape(ru))
  })

  it('no message is empty or untrimmed', () => {
    for (const lang of Object.values(messages))
      for (const codes of Object.values(lang))
        for (const text of Object.values(codes as Record<string, string>)) {
          expect(text.length).toBeGreaterThan(0)
          expect(text).toBe(text.trim())
        }
  })

  it('getMessage resolves by language, module and code', () => {
    expect(getMessage('ru', 'iin', 'checksum')).toBe('Неверная контрольная цифра ИИН')
    expect(getMessage('kk', 'iin', 'checksum')).toBe('ЖСН-нің бақылау цифры қате')
    expect(getMessage('en', 'phone', 'country')).toBe('Only Kazakhstan numbers (+7) are supported')
  })
})
