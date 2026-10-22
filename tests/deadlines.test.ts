import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { isWorkingDay } from '../src/calendar'
import type { Result } from '../src/core/result'
import { taxDeadlines } from '../src/deadlines'

const val = <T>(r: Result<T, string>): T => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe('taxDeadlines', () => {
  it('simplified declaration 910: half-years, moved off weekends', () => {
    const list = val(taxDeadlines(2026, { regime: 'simplified', tags: [] }))
    expect(list).toEqual([
      {
        id: 'f910',
        form: '910.00',
        kind: 'report',
        due: '2026-02-15',
        date: '2026-02-16',
        moved: true,
        period: { from: '2025-07-01', to: '2025-12-31' },
        regimes: ['simplified'],
      },
      {
        id: 'simplified',
        kind: 'pay',
        due: '2026-02-25',
        date: '2026-02-25',
        moved: false,
        period: { from: '2025-07-01', to: '2025-12-31' },
        regimes: ['simplified'],
      },
      expect.objectContaining({
        id: 'f910',
        date: '2026-08-17',
        period: { from: '2026-01-01', to: '2026-06-30' },
      }),
      expect.objectContaining({ id: 'simplified', date: '2026-08-25' }),
    ])
  })

  it('monthly payments: previous month, Nauryz shift moves 25 March', () => {
    const list = val(taxDeadlines(2026, { regime: 'general', tags: ['employees'] }))
    const ipn = list.filter((d) => d.id === 'ipnAgent')
    expect(ipn).toHaveLength(12)
    expect(ipn[0]).toMatchObject({
      due: '2026-01-25',
      date: '2026-01-26',
      period: { from: '2025-12-01', to: '2025-12-31' },
    })
    expect(ipn[2]).toMatchObject({ due: '2026-03-25', date: '2026-03-26', moved: true })
  })

  it('quarterly VAT and form 200 cover the previous quarter', () => {
    const list = val(taxDeadlines(2026, { regime: 'general', tags: ['vat', 'legal'] }))
    const vat = list.filter((d) => d.id === 'f300')
    expect(vat.map((d) => d.period)).toEqual([
      { from: '2025-10-01', to: '2025-12-31' },
      { from: '2026-01-01', to: '2026-03-31' },
      { from: '2026-04-01', to: '2026-06-30' },
      { from: '2026-07-01', to: '2026-09-30' },
    ])
    expect(list.some((d) => d.id === 'f200')).toBe(true)
    expect(list.some((d) => d.id === 'ipnAgent')).toBe(false)
  })

  it('annual: CIT declaration 31 March, payment ten days later', () => {
    const list = val(taxDeadlines(2026, { regime: 'general', tags: ['legal'] }))
    expect(list.find((d) => d.id === 'f100')).toMatchObject({
      due: '2026-03-31',
      period: { from: '2025-01-01', to: '2025-12-31' },
    })
    expect(list.find((d) => d.id === 'cit')).toMatchObject({ due: '2026-04-10' })
  })

  it('fixed dates: property current payments and farm income tax periods', () => {
    const general = val(taxDeadlines(2026, { regime: 'general', tags: ['propertyAdvances'] }))
    expect(general.filter((d) => d.id === 'propertyCurrent').map((d) => d.due)).toEqual([
      '2026-02-25',
      '2026-05-25',
      '2026-08-25',
      '2026-11-25',
    ])
    const farm = val(taxDeadlines(2026, { regime: 'farm' })).filter((d) => d.id === 'farmIpn')
    expect(farm.map((d) => d.period)).toEqual([
      { from: '2025-10-01', to: '2025-12-31' },
      { from: '2026-01-01', to: '2026-09-30' },
    ])
  })

  it('individuals', () => {
    const list = val(taxDeadlines(2026, { regime: 'individual', tags: ['car', 'home', 'income'] }))
    expect(list.map((d) => `${d.id} ${d.date}`)).toEqual([
      'transportPerson 2026-04-01',
      'f270 2026-09-15',
      'ipn270 2026-09-25',
      'propertyPerson 2026-10-01',
    ])
  })

  it('tags filter; without tags every deadline of the regime', () => {
    const none = val(taxDeadlines(2026, { regime: 'individual', tags: [] }))
    expect(none).toEqual([])
    const all = val(taxDeadlines(2026, { regime: 'individual' }))
    expect(all).toHaveLength(4)
    const everything = val(taxDeadlines(2026))
    expect(new Set(everything.flatMap((d) => d.regimes))).toEqual(
      new Set(['general', 'simplified', 'selfEmployed', 'farm', 'individual']),
    )
  })

  it('errors', () => {
    expect(taxDeadlines(2026.5)).toEqual({ ok: false, error: 'range' })
    expect(taxDeadlines(1000)).toEqual({ ok: false, error: 'range' })
    expect(taxDeadlines(9999)).toEqual({ ok: false, error: 'range' })
    expect(taxDeadlines(2030, { calendar: { strict: true } })).toEqual({ ok: false, error: 'data' })
  })

  it('data error when a shift crosses into a year without strict data', () => {
    // Test data: 27–31 Dec 2027 made days off, so 25 Dec (Saturday) moves into 2028.
    const transfers = ['11-06', '11-13', '11-20', '11-27', '12-04'].map((from, i) => ({
      from: `2027-${from}`,
      to: `2027-12-${27 + i}`,
    }))
    const calendar = { strict: true, years: { 2027: { kurbanAit: '2027-05-16', transfers } } }
    expect(taxDeadlines(2027, { calendar })).toEqual({ ok: false, error: 'data' })
  })

  it('property: every date is a working day not before the due date, sorted', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2024, max: 2027 }), (year) => {
        const list = val(taxDeadlines(year))
        for (const d of list) {
          expect(isWorkingDay(d.date)).toBe(true)
          expect(d.date >= d.due).toBe(true)
          expect(d.moved).toBe(d.date !== d.due)
          expect(d.period.from <= d.period.to).toBe(true)
        }
        expect(list.map((d) => d.date)).toEqual([...list.map((d) => d.date)].sort())
      }),
      { numRuns: 20 },
    )
  })
})
