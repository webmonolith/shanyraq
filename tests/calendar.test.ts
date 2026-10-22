import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  addWorkingDays,
  countWorkingDays,
  type DayOff,
  getDaysOff,
  isDayOff,
  isWorkingDay,
} from '../src/calendar'

const daysOff = (year: number, options = {}): DayOff[] => {
  const r = getDaysOff(year, options)
  if (!r.ok) throw new Error(r.error)
  return r.value
}

const brief = (list: DayOff[]) => list.map((d) => `${d.date} ${d.kind} ${d.holiday?.id ?? d.from}`)

describe('getDaysOff', () => {
  it('2026: Constitution Day neither on 15 March nor on 30 August; weekend shifts', () => {
    expect(brief(daysOff(2026))).toEqual([
      '2026-01-01 holiday new-year',
      '2026-01-02 holiday new-year',
      '2026-01-07 holiday orthodox-christmas',
      '2026-03-08 holiday womens-day',
      '2026-03-09 shift womens-day',
      '2026-03-21 holiday nauryz',
      '2026-03-22 holiday nauryz',
      '2026-03-23 holiday nauryz',
      '2026-03-24 shift nauryz',
      '2026-03-25 shift nauryz',
      '2026-05-01 holiday unity-day',
      '2026-05-07 holiday defender-day',
      '2026-05-09 holiday victory-day',
      '2026-05-11 shift victory-day',
      '2026-05-27 holiday kurban-ait',
      '2026-07-06 holiday capital-day',
      '2026-10-25 holiday republic-day',
      '2026-10-26 shift republic-day',
      '2026-12-16 holiday independence-day',
    ])
  })

  it('2027: Constitution Day on 15 March; 2 January shifts to Monday; Kurban ait on Sunday does not', () => {
    const list = brief(daysOff(2027))
    expect(list).toContain('2027-03-15 holiday constitution-day')
    expect(list).toContain('2027-01-04 shift new-year')
    expect(list).toContain('2027-05-16 holiday kurban-ait')
    expect(list).not.toContain('2027-05-17 shift kurban-ait')
  })

  it('2025: transfer from Sunday 5 January to Friday 3 January', () => {
    expect(brief(daysOff(2025)).slice(0, 3)).toEqual([
      '2025-01-01 holiday new-year',
      '2025-01-02 holiday new-year',
      '2025-01-03 transfer 2025-01-05',
    ])
  })

  it('2021: 30 August and 16–17 December; no Republic Day', () => {
    const list = brief(daysOff(2021))
    expect(list).toContain('2021-08-30 holiday constitution-day')
    expect(list).toContain('2021-12-16 holiday independence-day')
    expect(list).toContain('2021-12-17 holiday independence-day')
    expect(list.some((d) => d.includes('republic-day'))).toBe(false)
  })

  it('2022: Republic Day added, 17 December dropped, New Year on a weekend shifts twice', () => {
    const list = brief(daysOff(2022))
    expect(list).toContain('2022-10-25 holiday republic-day')
    expect(list).toContain('2022-01-03 shift new-year')
    expect(list).toContain('2022-01-04 shift new-year')
    expect(list).not.toContain('2022-12-17 holiday independence-day')
  })

  it('carries names in three languages', () => {
    expect(daysOff(2026)[5]?.holiday).toEqual({
      id: 'nauryz',
      type: 'state',
      name: { ru: 'Наурыз мейрамы', kk: 'Наурыз мейрамы', en: 'Nauryz' },
    })
  })

  it('without Kurban ait data the day is missing; strict reports it', () => {
    expect(daysOff(2028).some((d) => d.holiday?.id === 'kurban-ait')).toBe(false)
    expect(getDaysOff(2028, { strict: true })).toEqual({ ok: false, error: 'data' })
    expect(getDaysOff(2023, { strict: true })).toEqual({ ok: false, error: 'data' })
    expect(getDaysOff(2026, { strict: true }).ok).toBe(true)
  })

  it('user data adds or replaces a year', () => {
    const years = {
      2028: { kurbanAit: '2028-05-05', transfers: [{ from: '2028-05-06', to: '2028-05-08' }] },
    }
    const list = brief(daysOff(2028, { years, strict: true }))
    expect(list).toContain('2028-05-05 holiday kurban-ait')
    expect(list).toContain('2028-05-08 transfer 2028-05-06')
    expect(isWorkingDay('2028-05-06', { years })).toBe(true)
    const fixed = {
      2026: { kurbanAit: '2026-05-26', transfers: [{ from: 'bad', to: '2026-01-01' }] },
    }
    expect(brief(daysOff(2026, { years: fixed }))).toContain('2026-05-26 holiday kurban-ait')
  })

  it.each([1.5, 999, 10000, Number.NaN])('year %s → range', (year) => {
    expect(getDaysOff(year)).toEqual({ ok: false, error: 'range' })
  })

  it('works for 1970 (day number 0)', () => {
    expect(brief(daysOff(1970))[0]).toBe('1970-01-01 holiday new-year')
  })
})

describe('isDayOff / isWorkingDay', () => {
  it.each([
    ['2026-10-22', false],
    ['2026-10-24', true],
    ['2026-03-24', true],
    ['2026-08-31', false],
    ['2024-05-04', false],
    ['2024-05-08', true],
    ['2024-06-17', false],
    ['2025-01-05', false],
  ])('%s day off: %s', (date, off) => {
    expect(isDayOff(date)).toBe(off)
    expect(isWorkingDay(date)).toBe(!off)
  })

  it('takes Date objects by their local calendar day', () => {
    expect(isDayOff(new Date(2026, 0, 1))).toBe(true)
    expect(isWorkingDay(new Date(2026, 9, 22, 23, 59))).toBe(true)
  })

  it.each(['2026-02-30', '22.10.2026', '', new Date(Number.NaN), 20261022 as unknown as string])(
    'invalid %j is neither',
    (date) => {
      expect(isDayOff(date)).toBe(false)
      expect(isWorkingDay(date)).toBe(false)
    },
  )
})

describe('addWorkingDays', () => {
  it.each([
    ['2026-12-15', 1, '2026-12-17'],
    ['2026-03-20', 1, '2026-03-26'],
    ['2026-03-26', -1, '2026-03-20'],
    ['2026-10-22', 0, '2026-10-22'],
    ['2026-10-24', 0, '2026-10-24'],
    ['2026-12-31', 1, '2027-01-05'],
    ['2024-05-03', 1, '2024-05-04'],
  ])('%s + %i → %s', (date, n, expected) => {
    expect(addWorkingDays(date, n)).toEqual({ ok: true, value: expected })
  })

  it('errors', () => {
    expect(addWorkingDays('nope', 1)).toEqual({ ok: false, error: 'date' })
    expect(addWorkingDays('2026-01-01', 1.5)).toEqual({ ok: false, error: 'range' })
    expect(addWorkingDays('9999-12-30', 5)).toEqual({ ok: false, error: 'range' })
    expect(addWorkingDays('2027-12-30', 5, { strict: true })).toEqual({ ok: false, error: 'data' })
  })

  it('is inverted by the opposite move from a working day', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 * 365 }),
        fc.integer({ min: -60, max: 60 }),
        (offset, n) => {
          const start = new Date(Date.UTC(2024, 0, 1) + offset * 864e5).toISOString().slice(0, 10)
          if (!isWorkingDay(start)) return true
          const there = addWorkingDays(start, n)
          if (!there.ok || !isWorkingDay(there.value)) return false
          const back = addWorkingDays(there.value, -n)
          return back.ok && back.value === start
        },
      ),
      { numRuns: 2_000 },
    )
  })
})

describe('countWorkingDays', () => {
  it.each([
    ['2026-03-01', '2026-03-31', 18],
    ['2026-10-22', '2026-10-22', 1],
    ['2026-10-24', '2026-10-25', 0],
    ['2026-01-01', '2026-12-31', 247],
  ])('%s … %s → %i', (from, to, n) => {
    expect(countWorkingDays(from, to)).toEqual({ ok: true, value: n })
  })

  it('errors', () => {
    expect(countWorkingDays('2026-01-02', '2026-01-01')).toEqual({ ok: false, error: 'range' })
    expect(countWorkingDays('2026-01-01', 'x')).toEqual({ ok: false, error: 'date' })
    expect(countWorkingDays('2028-01-01', '2028-01-02', { strict: true })).toEqual({
      ok: false,
      error: 'data',
    })
  })

  it('agrees with addWorkingDays', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 * 365 }),
        fc.integer({ min: 1, max: 40 }),
        (offset, n) => {
          const start = new Date(Date.UTC(2024, 0, 1) + offset * 864e5).toISOString().slice(0, 10)
          const end = addWorkingDays(start, n)
          if (!end.ok) return false
          const count = countWorkingDays(start, end.value)
          return count.ok && count.value === n + (isWorkingDay(start) ? 1 : 0)
        },
      ),
      { numRuns: 2_000 },
    )
  })

  it('equals a day-by-day isWorkingDay count across year boundaries', () => {
    const iso = (offset: number) =>
      new Date(Date.UTC(2019, 0, 1) + offset * 864e5).toISOString().slice(0, 10)
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9 * 365 }),
        fc.integer({ min: 0, max: 800 }),
        (offset, length) => {
          let n = 0
          for (let i = 0; i <= length; i++) if (isWorkingDay(iso(offset + i))) n++
          const count = countWorkingDays(iso(offset), iso(offset + length))
          return count.ok && count.value === n
        },
      ),
      { numRuns: 100 },
    )
  }, 30_000)
})
