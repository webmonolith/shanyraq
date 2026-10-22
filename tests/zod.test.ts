import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { en, kk } from '../src/i18n'
import { bin, iban, iin, phone, plate, taxId } from '../src/zod'

const issue = (schema: z.ZodType, input: unknown) => {
  const r = schema.safeParse(input)
  if (r.success) throw new Error('expected failure')
  return r.error.issues[0] as z.core.$ZodIssue
}

describe('zod adapter', () => {
  it('outputs normalized values', () => {
    const form = z.object({ iin: iin(), bin: bin(), taxId: taxId(), phone: phone() })
    expect(
      form.parse({
        iin: '900101 300126',
        bin: '1803-4002-1791',
        taxId: '900101300126',
        phone: '8 (707) 123-45-67',
      }),
    ).toEqual({
      iin: '900101300126',
      bin: '180340021791',
      taxId: '900101300126',
      phone: '+77071234567',
    })
  })

  it('reports a localized message and the error code', () => {
    expect(issue(iin(), '900101300123')).toMatchObject({
      code: 'custom',
      message: 'Неверная контрольная цифра ИИН',
      params: { shanyraq: 'iin.checksum' },
    })
    expect(issue(bin({ messages: kk }), '900101300126').message).toBe(
      'Заңды тұлғаның түрі белгісіз (БСН-нің 5-цифры)',
    )
    expect(issue(taxId({ messages: en }), '1').message).toBe('IIN/BIN must be 12 digits long')
    expect(issue(phone({ message: 'Bad phone' }), '+1 202 555 0123').message).toBe('Bad phone')
  })

  it('passes strict options through', () => {
    expect(iin({ strict: true }).safeParse('900101 300126').success).toBe(false)
    expect(phone({ strict: true }).safeParse('+79161234567').success).toBe(false)
    expect(issue(phone({ strict: true }), '+79161234567')).toMatchObject({
      params: { shanyraq: 'phone.country' },
    })
  })

  it('rejects non-strings with the zod type issue', () => {
    expect(issue(iin(), 900101300126).code).toBe('invalid_type')
  })

  it('iban and plate', () => {
    expect(iban().parse('kz86 125k zt50 0410 0100')).toBe('KZ86125KZT5004100100')
    expect(plate().parse('237blm01')).toBe('237 BLM 01')
    expect(
      issue(iban({ strict: true }), 'KZ86125KZT5004100100'.replace('125', '111')),
    ).toMatchObject({
      params: { shanyraq: 'iban.checksum' },
    })
    expect(issue(iban({ messages: en }), 'DE86125KZT5004100100').message).toBe(
      'IBAN must start with KZ',
    )
    expect(issue(plate(), '237 BLM 25')).toMatchObject({
      message: 'Неизвестный код региона в госномере',
      params: { shanyraq: 'plate.region' },
    })
    expect(plate({ strict: true }).safeParse('237blm01').success).toBe(false)
  })
})
