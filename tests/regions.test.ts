import { describe, expect, it } from 'vitest'
import data from '../data/regions.json'
import { getRegion, REGIONS, regionByKato, regionByPlateCode } from '../src/regions'

describe('regions', () => {
  it('ships every region of data/regions.json', () => {
    expect(REGIONS).toHaveLength(20)
    for (const r of data.regions)
      expect(getRegion(r.id)).toEqual({
        id: r.id,
        kind: r.kind,
        name: { ru: r.nameRu, kk: r.nameKk, en: r.nameEn },
        center: r.center,
        plateCode: r.plateCode,
        katoPrefix: r.katoPrefix,
        katoCode: r.katoCode,
      })
  })

  it('ids, plate codes and KATO prefixes are unique', () => {
    for (const key of ['id', 'plateCode', 'katoPrefix'] as const)
      expect(new Set(REGIONS.map((r) => r[key])).size).toBe(REGIONS.length)
  })

  it.each([
    ['01', 'astana'],
    ['02', 'almaty'],
    ['13', 'turkestan'],
    ['17', 'shymkent'],
    ['20', 'ulytau'],
  ])('plate code %s → %s', (code, id) => {
    expect(regionByPlateCode(code)?.id).toBe(id)
  })

  it.each(['00', '21', '1', '001', 'AB', ''])('plate code %j → undefined', (code) => {
    expect(regionByPlateCode(code)).toBeUndefined()
  })

  it.each([
    ['710000000', 'astana'],
    ['751110000', 'almaty'],
    ['61', 'turkestan'],
    ['191810000', 'almaty-region'],
    ['62', 'ulytau'],
  ])('KATO %s → %s', (code, id) => {
    expect(regionByKato(code)?.id).toBe(id)
  })

  it.each(['51', '9', '', 'x1'])('KATO %j → undefined', (code) => {
    expect(regionByKato(code)).toBeUndefined()
  })

  it('getRegion: unknown id', () => {
    expect(getRegion('nope')).toBeUndefined()
  })
})
