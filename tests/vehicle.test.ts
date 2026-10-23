import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Result } from '../src/core/result'
import { recyclingFee, registrationFee, vehicleTax } from '../src/vehicle'

const val = <T>(r: Result<T, string>): T => {
  if (!r.ok) throw new Error(r.error)
  return r.value
}
const car = (volume: number, made?: number) =>
  val(vehicleTax('car', made === undefined ? { volume } : { volume, made })).annual

describe('vehicleTax', () => {
  it('cars: MRP by engine volume plus 7 ₸ per cc above the bracket lower bound', () => {
    expect(car(1100)).toBe(4325)
    expect(car(1101)).toBe(8650)
    expect(car(1500)).toBe(8650)
    expect(car(1600)).toBe(13675)
    expect(car(2500)).toBe(29450)
    expect(car(4500)).toBe(509525)
  })

  it('age coefficients: over 10 years 0.7, over 20 years 0.5', () => {
    expect(car(2000, 2016)).toBe(16475)
    expect(val(vehicleTax('car', { volume: 2000, made: 2015 }))).toEqual({
      rate: 3,
      mrp: 4325,
      extra: 3500,
      coefficient: 0.7,
      annual: 11532.5,
      tax: 11532.5,
    })
    expect(car(2000, 2006)).toBe(11532.5)
    expect(car(2000, 2005)).toBe(8237.5)
  })

  it('part of the year', () => {
    expect(val(vehicleTax('car', { volume: 1200, months: 6 })).tax).toBe(4325)
  })

  it('trucks, buses, motorcycles, special machines', () => {
    expect(val(vehicleTax('truck', { tonnage: 1 })).annual).toBe(12975)
    expect(val(vehicleTax('truck', { tonnage: 1.2 })).rate).toBe(5)
    expect(val(vehicleTax('truck', { tonnage: 10 })).annual).toBe(38925)
    expect(val(vehicleTax('bus', { seats: 12 })).rate).toBe(9)
    expect(val(vehicleTax('bus', { seats: 30 })).annual).toBe(86500)
    expect(val(vehicleTax('moto', { kw: 55 })).rate).toBe(1)
    expect(val(vehicleTax('moto', { kw: 56 })).rate).toBe(10)
    expect(val(vehicleTax('special')).annual).toBe(12975)
  })

  it('errors', () => {
    expect(vehicleTax('car')).toEqual({ ok: false, error: 'invalid' })
    expect(vehicleTax('bus', { seats: -1 })).toEqual({ ok: false, error: 'invalid' })
    expect(vehicleTax('car', { volume: 1, made: 2030 })).toEqual({ ok: false, error: 'range' })
    expect(vehicleTax('car', { volume: 1, made: 1.5 })).toEqual({ ok: false, error: 'range' })
    expect(vehicleTax('car', { volume: 1, months: 0 })).toEqual({ ok: false, error: 'range' })
    expect(vehicleTax('car', { volume: 1, year: 2020 })).toEqual({ ok: false, error: 'data' })
  })

  it('property: more cc never costs less', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9000 }), (v) => {
        expect(car(v + 1)).toBeGreaterThanOrEqual(car(v))
      }),
    )
  })
})

describe('registrationFee', () => {
  const fee = (kind: Parameters<typeof registrationFee>[0], made: number) =>
    val(registrationFee(kind, made, 2026))
  it('cars: up to 2 years with the year of manufacture 0.25 MRP, 3rd year 50, then 500', () => {
    expect(fee('car', 2026)).toEqual({ age: 1, rate: 0.25, fee: 1081.25 })
    expect(fee('car', 2025).rate).toBe(0.25)
    expect(fee('car', 2024)).toEqual({ age: 3, rate: 50, fee: 216250 })
    expect(fee('car', 2023).fee).toBe(2162500)
    expect(fee('car', 2027).age).toBe(1)
  })

  it('electric cars, trucks, tractor units', () => {
    expect(fee('electric', 2024).fee).toBe(108125)
    expect(fee('electric', 2020).fee).toBe(1081250)
    expect(fee('truck', 2022).fee).toBe(1513750)
    expect(fee('truck', 2021).fee).toBe(10812500)
    expect(fee('tractor', 2020).rate).toBe(350)
    expect(val(registrationFee('car', 2026)).fee).toBe(1081.25)
  })

  it('errors', () => {
    expect(registrationFee('car', 2028, 2026)).toEqual({ ok: false, error: 'range' })
    expect(registrationFee('boat' as 'car', 2020)).toEqual({ ok: false, error: 'invalid' })
    expect(registrationFee('toString' as 'car', 2020)).toEqual({ ok: false, error: 'invalid' })
    expect(registrationFee('car', 2020, 2020)).toEqual({ ok: false, error: 'data' })
  })
})

describe('recyclingFee', () => {
  it('50 MRP × coefficient 1 by engine volume', () => {
    expect(val(recyclingFee('car', { volume: 1600 }))).toEqual({
      coefficient: 3.5,
      base: 216250,
      fee: 756875,
    })
    expect(val(recyclingFee('car', { volume: 1000 })).fee).toBe(324375)
    expect(val(recyclingFee('car', { volume: 3001 })).fee).toBe(2486875)
    expect(val(recyclingFee('bus', { volume: 2500 })).coefficient).toBe(4)
    expect(val(recyclingFee('truck', { mass: 3 })).fee).toBe(1621875)
  })

  it('electric cars and the Russia/Belarus coefficient 2', () => {
    expect(val(recyclingFee('car', { electric: true })).fee).toBe(0)
    expect(val(recyclingFee('car', { electric: true, fromRuBy: true })).fee).toBe(12975000)
    expect(val(recyclingFee('car', { volume: 1600, fromRuBy: true })).fee).toBe(29410000)
  })

  it('errors', () => {
    expect(recyclingFee('car')).toEqual({ ok: false, error: 'invalid' })
    expect(recyclingFee('truck', { mass: 60 })).toEqual({ ok: false, error: 'range' })
    expect(recyclingFee('boat' as 'car', { volume: 1 })).toEqual({ ok: false, error: 'invalid' })
    expect(recyclingFee('baseMrp' as 'car', { volume: 1 })).toEqual({ ok: false, error: 'invalid' })
    expect(recyclingFee('toString' as 'car', { volume: 1 })).toEqual({
      ok: false,
      error: 'invalid',
    })
    expect(recyclingFee('car', { volume: 1, year: 2020 })).toEqual({ ok: false, error: 'data' })
  })
})
