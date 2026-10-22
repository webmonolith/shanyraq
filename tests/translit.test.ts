import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import data from '../data/translit-2021.json'
import { toLatin } from '../src/translit'

const s2018 = { scheme: '2018' as const }

describe('toLatin 2021', () => {
  it.each([
    ['Қазақстан Республикасы', 'Qazaqstan Respublikasy'],
    ['Шымкент', 'Şymkent'],
    ['Әйгерім', 'Äigerım'],
    ['ИИН', 'İİN'],
    ['ұлттық ғылым', 'ūlttyq ğylym'],
    ['Өскемен, Үржар, Ілийск, Һ', 'Öskemen, Ürjar, Iliisk, H'],
    ['маңғыстау', 'mañğystau'],
    ['объект', 'obekt'],
    ['Ёж', 'İoj'],
    ['ЦЕНТР', 'TSENTR'],
    ['Центр', 'Tsentr'],
    ['ЩУЧИНСК', 'ŞTŞUTŞİNSK'],
    ['ПОЛЮС', 'POLİUS'],
    ['Я', 'İa'],
    ['ДАРЬЯ', 'DARİA'],
    ['Hello, 123 — мир!', 'Hello, 123 — mir!'],
    ['', ''],
  ])('%j → %j', (input, expected) => {
    expect(toLatin(input)).toBe(expected)
  })

  it('matches the draft table letter by letter', () => {
    for (const m of data.map) {
      expect(toLatin(m.cyr)).toBe(m.lat)
      expect(toLatin(m.cyr.toLowerCase())).toBe(m.latLower)
    }
  })

  it('never upper-cases i to I: И → İ, І → I', () => {
    expect(toLatin('И і І и')).toBe('İ ı I i')
  })
})

describe('toLatin 2018', () => {
  it.each([
    ['Қазақстан Республикасы', 'Qazaqstan Respýblıkasy'],
    ['Шымкент', 'Shymkent'],
    ['ШЫМКЕНТ', 'SHYMKENT'],
    ['Әйгерім', 'Áıgerim'],
    ['Ғылым, Өнер, Үй, Ңң', 'Ǵylym, Óner, Úı, Ńń'],
    ['Чай', 'Chaı'],
    ['Юрта', 'Iýrta'],
    ['юрта', 'ıýrta'],
    ['щука', 'shchýka'],
  ])('%j → %j', (input, expected) => {
    expect(toLatin(input, s2018)).toBe(expected)
  })
})

describe('toLatin', () => {
  it('leaves no Cyrillic behind and keeps non-Cyrillic text', () => {
    const letters = data.map.flatMap((m) => [m.cyr, m.cyr.toLowerCase()])
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.constantFrom(...letters), fc.constantFrom(' ', '-', 'x', '1', '.')), {
          maxLength: 30,
        }),
        fc.constantFrom('2021', '2018') as fc.Arbitrary<'2021'>,
        (chars, scheme) => {
          const out = toLatin(chars.join(''), { scheme })
          return !/[Ѐ-ӿ]/.test(out) && out.normalize('NFC') === out
        },
      ),
      { numRuns: 10_000 },
    )
  })

  it('returns an empty string for non-strings from untyped callers', () => {
    expect(toLatin(null as unknown as string)).toBe('')
  })
})
