import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Result } from '../src/core/result'
import { landTax, propertyTax, propertyValue } from '../src/property'

const val = <T>(r: Result<T, string>): T => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe('propertyValue', () => {
  it('C = Cб × S × Кфиз × Кфункц × Кзон × Кизм.мрп × Кроск', () => {
    expect(
      val(propertyValue({ settlement: 'almaty', area: 60, built: 2010, walls: 'panel' })),
    ).toEqual({
      base: 60000,
      wear: 11.2,
      physical: 0.888,
      functional: 1,
      zone: 1,
      mrpIndex: 1.099949,
      luxury: 1,
      value: 3516317.4,
    })
    const v = val(
      propertyValue({
        settlement: 'astana',
        area: '80',
        built: 2020,
        walls: 'brick',
        floor: 'last',
        corner: true,
        heating: 'gas',
        zone: 1.2,
      }),
    )
    expect(v).toMatchObject({ wear: 4.2, functional: 0.92169, value: 5594296.37 })
  })

  it('worn-out building: Кфиз = 0.2; no amenities, stove heating', () => {
    const v = val(
      propertyValue({
        settlement: 'village',
        area: 100,
        built: 1970,
        group: 5,
        walls: 'adobe',
        amenities: false,
        heating: 'stove',
      }),
    )
    expect(v).toMatchObject({
      base: 2700,
      wear: 184.8,
      physical: 0.2,
      functional: 0.36,
      value: 21383.01,
    })
    // Stone limit is 70 %, other materials 65 %.
    expect(
      val(propertyValue({ settlement: 'village', area: 1, built: 1926, year: 2026 })).physical,
    ).toBe(0.3)
    expect(
      val(propertyValue({ settlement: 'village', area: 1, built: 1926, group: 3 })).physical,
    ).toBe(0.2)
    expect(
      val(propertyValue({ settlement: 'village', area: 1, built: 1994, group: 4 })).physical,
    ).toBe(0.36)
    expect(
      val(propertyValue({ settlement: 'village', area: 1, built: 1993, group: 4 })).physical,
    ).toBe(0.2)
  })

  it('garage 15 %, storage 25 %, no functional wear or luxury', () => {
    expect(
      val(
        propertyValue({ kind: 'garage', settlement: 'almaty', area: 18, built: 2010, luxury: 1.5 }),
      ),
    ).toMatchObject({ base: 9000, functional: 1, luxury: 1, value: 158234.28 })
    expect(
      val(
        propertyValue({
          kind: 'storage',
          settlement: 'almaty',
          area: 10,
          built: 2026,
          floor: 'first',
        }),
      ).value,
    ).toBe(164992.37)
  })

  it('own MRP index and luxury', () => {
    const v = val(
      propertyValue({ settlement: 'shymkent', area: 100, built: 2026, mrpIndex: 1, luxury: 1.5 }),
    )
    expect(v.value).toBe(9000000)
  })

  it('errors', () => {
    const base = { settlement: 'almaty', area: 50, built: 2000 } as const
    expect(propertyValue({ ...base, area: 'x' })).toEqual({ ok: false, error: 'invalid' })
    expect(propertyValue({ ...base, settlement: 'paris' as 'almaty' })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(propertyValue({ ...base, group: 7 })).toEqual({ ok: false, error: 'range' })
    expect(propertyValue({ ...base, built: 2027 })).toEqual({ ok: false, error: 'range' })
    expect(propertyValue({ ...base, built: 2000.5 })).toEqual({ ok: false, error: 'range' })
    expect(propertyValue({ ...base, walls: 'glass' as 'brick' })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(propertyValue({ ...base, heating: 'sun' as 'gas' })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(propertyValue({ ...base, floor: 'roof' as 'last' })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(propertyValue({ ...base, zone: 0 })).toEqual({ ok: false, error: 'range' })
    expect(propertyValue({ ...base, luxury: 1.6 })).toEqual({ ok: false, error: 'range' })
    expect(propertyValue({ ...base, mrpIndex: 3 })).toEqual({ ok: false, error: 'range' })
    expect(propertyValue({ ...base, kind: 'tent' as 'garage' })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(propertyValue({ ...base, year: 2025 })).toEqual({ ok: false, error: 'data' })
    expect(val(propertyValue({ ...base, year: 2025, mrpIndex: 1.06 })).mrpIndex).toBe(1.06)
  })
})

describe('propertyTax', () => {
  it('scale of art. 602 p. 1', () => {
    expect(val(propertyTax(15000000))).toEqual({
      base: 15000000,
      aggregate: false,
      items: [{ value: 15000000, annual: 26100, tax: 26100 }],
      tax: 26100,
    })
    expect(val(propertyTax('1 000 000')).tax).toBe(500)
    expect(val(propertyTax(0)).tax).toBe(0)
    expect(val(propertyTax({ value: 100000000, share: 0.5, months: 6 })).items[0]).toEqual({
      value: 50000000,
      annual: 196600,
      tax: 98300,
    })
  })

  it('each object separately up to 450 mln in total, then one tax split by value', () => {
    const under = val(propertyTax([{ value: 400000000 }, { value: 50000000 }]))
    expect(under).toMatchObject({ base: 450000000, aggregate: false, tax: 2768200 })
    const over = val(propertyTax([{ value: 300000000 }, { value: 200000000 }]))
    expect(over).toMatchObject({ base: 500000000, aggregate: true, tax: 3946600 })
    expect(over.items.map((i) => i.annual)).toEqual([2367960, 1578640])
  })

  it('errors', () => {
    expect(propertyTax('x')).toEqual({ ok: false, error: 'invalid' })
    expect(propertyTax(-1)).toEqual({ ok: false, error: 'range' })
    expect(propertyTax([])).toEqual({ ok: false, error: 'range' })
    expect(propertyTax({ value: 1, share: 2 })).toEqual({ ok: false, error: 'range' })
    expect(propertyTax({ value: 1, months: 13 })).toEqual({ ok: false, error: 'range' })
    expect(propertyTax({ value: 1, months: 0 })).toEqual({ ok: false, error: 'range' })
  })

  it('property: the scale is continuous and growing', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1e9 }), fc.integer({ min: 1, max: 1e7 }), (v, d) => {
        const a = val(propertyTax(v)).tax
        const b = val(propertyTax(v + d)).tax
        expect(b).toBeGreaterThanOrEqual(a)
        expect(b - a).toBeLessThanOrEqual((d * 2) / 100 + 0.02)
      }),
    )
  })
})

describe('landTax', () => {
  it('housing land: rate per m² by settlement, maslikhat ±50 %', () => {
    expect(val(landTax('housing', 600, { settlement: 'astana' }))).toEqual({
      annual: 576,
      tax: 576,
    })
    expect(val(landTax('housing', 600, { settlement: 'astana', adjust: 50 })).annual).toBe(864)
    expect(
      val(landTax('housing', 1000, { settlement: 'districtCity', share: 0.5, months: 6 })),
    ).toEqual({
      annual: 95,
      tax: 47.5,
    })
  })

  it('yard plot: higher rate above 1000 m² in cities, 5000 m² elsewhere', () => {
    expect(val(landTax('yard', 1200, { settlement: 'almaty' })).annual).toBe(1400)
    expect(val(landTax('yard', 1200, { settlement: 'almaty', reduced: true })).annual).toBe(240)
    expect(val(landTax('yard', 6000, { settlement: 'village' })).annual).toBe(2000)
  })

  it('garden, dacha, personal farm: 20 ₸ per 0.01 ha up to 0.5 ha, then 100', () => {
    expect(val(landTax('garden', 6000)).annual).toBe(2000)
    expect(val(landTax('garden', 800)).annual).toBe(160)
  })

  it('errors', () => {
    expect(landTax('housing', 'x', { settlement: 'almaty' })).toEqual({
      ok: false,
      error: 'invalid',
    })
    expect(landTax('housing', 100)).toEqual({ ok: false, error: 'range' })
    expect(landTax('housing', 100, { settlement: 'almaty', adjust: 60 })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(landTax('garden', 100, { share: -1 })).toEqual({ ok: false, error: 'range' })
    expect(landTax('garden', 100, { months: 2.5 })).toEqual({ ok: false, error: 'range' })
    expect(landTax('forest' as 'garden', 100, { settlement: 'almaty' })).toEqual({
      ok: false,
      error: 'range',
    })
  })
})
