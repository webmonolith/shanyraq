import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Result } from '../src/core/result'
import { personalCarDuty } from '../src/customs'

const val = <T>(r: Result<T, string>): T => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}

const base = { volume: 1998, made: '2024-05-01', declared: '2026-10-23', eur: 500 }

describe('personalCarDuty', () => {
  it('up to 3 years: the larger of percent and minimum per cc', () => {
    expect(val(personalCarDuty(20000, base))).toEqual({
      age: 2,
      group: 'upTo3',
      percent: 48,
      perCc: 5.5,
      byValue: 9600,
      byVolume: 10989,
      euro: 10989,
      duty: 5494500,
    })
    const cheap = val(personalCarDuty(8500, { ...base, volume: 1000 }))
    expect(cheap).toMatchObject({ percent: 54, perCc: 2.5, byValue: 4590, euro: 4590 })
    const pricey = val(personalCarDuty(200000, { ...base, volume: 3000 }))
    expect(pricey).toMatchObject({
      percent: 48,
      perCc: 20,
      byValue: 96000,
      byVolume: 60000,
      euro: 96000,
    })
  })

  it('value brackets include their upper bound', () => {
    expect(val(personalCarDuty(16700, base)).perCc).toBe(3.5)
    expect(val(personalCarDuty(16700.01, base)).perCc).toBe(5.5)
    expect(val(personalCarDuty(169000, base)).perCc).toBe(15)
    expect(val(personalCarDuty(169000.5, base)).perCc).toBe(20)
  })

  it('3 to 5 and over 5 years: per cc by volume, value ignored', () => {
    const mid = val(personalCarDuty(0, { ...base, made: '2022-01-01' }))
    expect(mid).toEqual({
      age: 4,
      group: 'upTo5',
      perCc: 2.7,
      byVolume: 5394.6,
      euro: 5394.6,
      duty: 2697300,
    })
    const old = val(personalCarDuty('1 000 000', { ...base, volume: 3001, made: '2015-06-01' }))
    expect(old).toMatchObject({ group: 'over5', perCc: 5.7, euro: 17105.7, duty: 8552850 })
    expect(val(personalCarDuty(0, { ...base, volume: 1800, made: '2015-06-01' })).perCc).toBe(3.5)
    expect(val(personalCarDuty(0, { ...base, volume: 1801, made: '2015-06-01' })).perCc).toBe(4.8)
  })

  it('exactly 3 and 5 years still belong to the younger group', () => {
    const at = (made: string) => val(personalCarDuty(10000, { ...base, made })).group
    expect(at('2023-10-23')).toBe('upTo3')
    expect(at('2023-10-22')).toBe('upTo5')
    expect(at('2021-10-23')).toBe('upTo5')
    expect(at('2021-10-22')).toBe('over5')
    // 29 February + 3 years = 28 February
    expect(
      val(personalCarDuty(10000, { ...base, made: '2024-02-29', declared: '2027-02-28' })).group,
    ).toBe('upTo3')
    expect(
      val(personalCarDuty(10000, { ...base, made: '2024-02-29', declared: '2027-03-01' })).group,
    ).toBe('upTo5')
  })

  it('strings with spaces and commas', () => {
    const r = val(personalCarDuty('20 000,00', { ...base, volume: '1 998', eur: '500,00' }))
    expect(r.duty).toBe(5494500)
  })

  it('errors', () => {
    expect(personalCarDuty('x', base)).toEqual({ ok: false, error: 'invalid' })
    expect(personalCarDuty(1, { ...base, eur: '' })).toEqual({ ok: false, error: 'invalid' })
    expect(personalCarDuty(-1, base)).toEqual({ ok: false, error: 'range' })
    expect(personalCarDuty(1, { ...base, volume: 0 })).toEqual({ ok: false, error: 'range' })
    expect(personalCarDuty(1, { ...base, volume: 1500.5 })).toEqual({ ok: false, error: 'range' })
    expect(personalCarDuty(1, { ...base, eur: 0 })).toEqual({ ok: false, error: 'range' })
    expect(personalCarDuty(1, { ...base, made: '2026-13-01' })).toEqual({
      ok: false,
      error: 'date',
    })
    expect(personalCarDuty(1, { ...base, made: '2027-01-01' })).toEqual({
      ok: false,
      error: 'range',
    })
  })

  it('never below the per-cc minimum; tenge = euro × rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500_000 }),
        fc.integer({ min: 1, max: 8000 }),
        fc.integer({ min: 0, max: 20 * 365 }),
        (value, volume, days) => {
          const made = new Date(Date.UTC(2026, 9, 23) - days * 864e5).toISOString().slice(0, 10)
          const r = val(personalCarDuty(value, { volume, made, declared: '2026-10-23', eur: 500 }))
          expect(r.euro).toBeGreaterThanOrEqual(r.byVolume)
          expect(r.byVolume).toBeCloseTo(volume * r.perCc, 2)
          expect(r.duty).toBeCloseTo(r.euro * 500, 2)
          if (r.age < 3) expect(r.group).toBe('upTo3')
          if (r.age >= 3 && r.age < 5) expect(r.group).not.toBe('over5')
          if (r.age >= 5) expect(r.group).not.toBe('upTo3')
        },
      ),
    )
  })
})
