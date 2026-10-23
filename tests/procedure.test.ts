import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { isWorkingDay } from '../src/calendar'
import type { Result } from '../src/core/result'
import { procedureTerm } from '../src/procedure'

const val = <T>(r: Result<T, string>): T => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe('procedureTerm', () => {
  it('appeal: one month, 31 January ends on 28 February, moved off Saturday', () => {
    expect(val(procedureTerm('2026-01-31', 'appeal'))).toEqual({
      start: '2026-02-01',
      due: '2026-02-28',
      end: '2026-03-02',
      moved: true,
    })
  })

  it('month term ends on the same date; Nauryz and its shifted days off move it', () => {
    expect(val(procedureTerm('2026-02-20', { months: 1 }))).toMatchObject({
      due: '2026-03-20',
      end: '2026-03-20',
      moved: false,
    })
    expect(val(procedureTerm('2026-02-21', { months: 1 }))).toMatchObject({
      due: '2026-03-21',
      end: '2026-03-26',
      moved: true,
    })
  })

  it('cassation: six months; years; 29 February', () => {
    expect(val(procedureTerm('2026-08-31', 'cassation')).due).toBe('2027-02-28')
    expect(val(procedureTerm('2024-02-29', { years: 1 })).due).toBe('2025-02-28')
    expect(val(procedureTerm('2026-03-10', { years: 3 })).due).toBe('2029-03-10')
  })

  it('days and working days', () => {
    expect(val(procedureTerm('2026-12-10', { days: 5 })).due).toBe('2026-12-15')
    // 16 Dec Independence Day: off
    expect(val(procedureTerm('2026-12-10', { days: 6 }))).toMatchObject({
      due: '2026-12-16',
      end: '2026-12-17',
    })
    expect(val(procedureTerm('2026-12-14', 'privateComplaint'))).toMatchObject({
      start: '2026-12-15',
      due: '2026-12-29',
      moved: false,
    })
    expect(val(procedureTerm('2026-03-18', 'courtOrderObjection')).due).toBe('2026-04-06')
    expect(val(procedureTerm('2026-03-18', 'finalDecision')).due).toBe('2026-03-30')
  })

  it('errors', () => {
    expect(procedureTerm('nope', 'appeal')).toEqual({ ok: false, error: 'date' })
    expect(procedureTerm('2026-01-01', {})).toEqual({ ok: false, error: 'range' })
    expect(procedureTerm('2026-01-01', { days: 1, months: 1 })).toEqual({
      ok: false,
      error: 'range',
    })
    expect(procedureTerm('2026-01-01', { days: 0 })).toEqual({ ok: false, error: 'range' })
    expect(procedureTerm('2026-01-01', { days: 1.5 })).toEqual({ ok: false, error: 'range' })
    expect(procedureTerm('2026-01-01', 'nope' as 'appeal')).toEqual({ ok: false, error: 'range' })
    expect(procedureTerm('9999-12-01', { months: 1 })).toEqual({ ok: false, error: 'range' })
    expect(procedureTerm('9999-12-31', { days: 1 })).toEqual({ ok: false, error: 'range' })
    expect(procedureTerm('9999-12-30', { workingDays: 5 })).toEqual({ ok: false, error: 'range' })
    expect(procedureTerm('2030-01-10', 'appeal', { strict: true })).toEqual({
      ok: false,
      error: 'data',
    })
    expect(procedureTerm('2030-01-10', { workingDays: 1 }, { strict: true })).toEqual({
      ok: false,
      error: 'data',
    })
  })

  it('end is a working day, never before due; working-day terms are never moved', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.constantFrom('days', 'months', 'years', 'workingDays' as const),
        fc.integer({ min: 1, max: 40 }),
        (offset, unit, n) => {
          const event = new Date(Date.UTC(2024, 0, 1) + offset * 864e5).toISOString().slice(0, 10)
          const t = val(procedureTerm(event, { [unit]: n }))
          expect(isWorkingDay(t.end)).toBe(true)
          expect(t.end >= t.due && t.due > event).toBe(true)
          if (unit === 'workingDays') expect(t.moved).toBe(false)
        },
      ),
    )
  })
})
