import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Result } from '../src/core/result'
import { inheritanceShares } from '../src/inheritance'

const val = <T>(r: Result<T, string>): T => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}

const brief = (r: ReturnType<typeof inheritanceShares>) =>
  val(r).heirs.map((h) => [h.heir, h.count, h.share.join('/')])

describe('inheritanceShares', () => {
  it('order 1: children, spouse and parents in equal shares (art. 1061)', () => {
    expect(brief(inheritanceShares({ spouse: true, children: 3 }))).toEqual([
      ['spouse', 1, '1/4'],
      ['children', 3, '1/4'],
    ])
    expect(val(inheritanceShares({ children: 1, parents: 2 })).order).toBe(1)
  })

  it('representation: a predeceased child’s share is split among their descendants (art. 1067)', () => {
    const v = val(
      inheritanceShares({ spouse: true, children: 2, grandchildren: [2] }, { estate: 40000000 }),
    )
    expect(v.heirs).toEqual([
      { heir: 'spouse', count: 1, share: [1, 4], amount: 10000000 },
      { heir: 'children', count: 2, share: [1, 4], amount: 10000000 },
      { heir: 'grandchildren', count: 2, branch: 0, share: [1, 8], amount: 5000000 },
    ])
    expect(brief(inheritanceShares({ grandchildren: [1, 3] }))).toEqual([
      ['grandchildren', 1, '1/2'],
      ['grandchildren', 3, '1/6'],
    ])
  })

  it('joint marital property: half stays with the spouse (art. 1041, Family Code art. 38)', () => {
    const v = val(
      inheritanceShares({ spouse: true, children: 1 }, { estate: '5 000 000', joint: 20000000 }),
    )
    expect(v).toMatchObject({ marital: 10000000, estate: 15000000 })
    expect(v.heirs.map((h) => h.amount)).toEqual([7500000, 7500000])
  })

  it('later orders are called only when earlier ones are empty (art. 1060 p. 3, 1062–1064)', () => {
    expect(brief(inheritanceShares({ siblings: 2, grandparents: 1, nephews: [3] }))).toEqual([
      ['siblings', 2, '1/4'],
      ['grandparents', 1, '1/4'],
      ['nephews', 3, '1/12'],
    ])
    expect(val(inheritanceShares({ unclesAunts: 1, cousins: [2], siblings: 0 })).order).toBe(3)
    expect(val(inheritanceShares({ greatGrandparents: 2, fifth: 3 })).order).toBe(4)
    expect(val(inheritanceShares({ fifth: 1, sixth: 1 })).order).toBe(5)
    expect(val(inheritanceShares({ sixth: 1 })).order).toBe(6)
    expect(brief(inheritanceShares({ seventh: 2, nephews: [] }))).toEqual([['seventh', 2, '1/2']])
  })

  it('disabled dependants: equally with the called order, alone as order 8 (art. 1068)', () => {
    expect(brief(inheritanceShares({ children: 1, dependants: 1 }))).toEqual([
      ['children', 1, '1/2'],
      ['dependants', 1, '1/2'],
    ])
    expect(val(inheritanceShares({ dependants: 3 }))).toMatchObject({
      order: 8,
      heirs: [{ heir: 'dependants', count: 3, share: [1, 3] }],
    })
  })

  it('no heirs: escheat (art. 1083)', () => {
    expect(val(inheritanceShares({ spouse: false }, { estate: 100 }))).toEqual({
      order: 0,
      estate: 100,
      marital: 0,
      heirs: [],
      obligatory: [],
      free: [1, 1],
    })
  })

  it('obligatory share: half of the intestate share (art. 1069)', () => {
    const v = val(
      inheritanceShares(
        { spouse: true, children: 3 },
        { estate: 8000000, obligatory: { spouse: true, children: 1 } },
      ),
    )
    expect(v.obligatory).toEqual([
      { heir: 'spouse', count: 1, share: [1, 8], amount: 1000000 },
      { heir: 'children', count: 1, share: [1, 8], amount: 1000000 },
    ])
    expect(v.free).toEqual([3, 4])
    expect(val(inheritanceShares({ parents: 2 }, { obligatory: { parents: 2 } })).free).toEqual([
      1, 2,
    ])
  })

  it('errors', () => {
    expect(inheritanceShares({ children: 1 }, { estate: 'x' })).toEqual({
      ok: false,
      error: 'invalid',
    })
    expect(inheritanceShares({}, { joint: -1 })).toEqual({ ok: false, error: 'range' })
    expect(inheritanceShares({}, { estate: 1e16 })).toEqual({ ok: false, error: 'range' })
    expect(inheritanceShares({ parents: 3 })).toEqual({ ok: false, error: 'range' })
    expect(inheritanceShares({ children: 1.5 })).toEqual({ ok: false, error: 'range' })
    expect(inheritanceShares({ grandchildren: [0] })).toEqual({ ok: false, error: 'range' })
    expect(inheritanceShares({ children: [1] as unknown as number })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(inheritanceShares({ grandchildren: 2 as unknown as number[] })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(inheritanceShares({ children: 1 }, { obligatory: { children: 2 } })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(inheritanceShares({ siblings: 1 }, { obligatory: { spouse: true } })).toEqual({
      ok: false,
      error: 'range',
    })
  })

  it('property: shares of the called heirs add up to the whole estate', () => {
    const small = fc.integer({ min: 0, max: 6 })
    fc.assert(
      fc.property(
        fc.record({
          spouse: fc.boolean(),
          children: small,
          grandchildren: fc.array(fc.integer({ min: 1, max: 5 }), { maxLength: 3 }),
          parents: fc.integer({ min: 0, max: 2 }),
          siblings: small,
          nephews: fc.array(fc.integer({ min: 1, max: 5 }), { maxLength: 3 }),
          grandparents: fc.integer({ min: 0, max: 4 }),
          dependants: fc.integer({ min: 0, max: 3 }),
          seventh: small,
        }),
        (heirs) => {
          const v = val(inheritanceShares(heirs))
          const sum = v.heirs.reduce((s, h) => s + (h.count * h.share[0]) / h.share[1], 0)
          expect(sum).toBeCloseTo(v.order ? 1 : 0, 12)
        },
      ),
    )
  })
})
