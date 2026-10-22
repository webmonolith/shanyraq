import { BY_PLATE_CODE, REGIONS } from './generated'
import type { Region } from './types'

export { REGIONS }

/**
 * Region by id.
 * @example
 * getRegion('abai')?.name.ru // 'область Абай'
 */
export const getRegion = (id: string): Region | undefined => REGIONS.find((r) => r.id === id)

/**
 * Region by licence plate code `01`–`20`.
 * @example
 * regionByPlateCode('02')?.id // 'almaty'
 */
export const regionByPlateCode = (code: string): Region | undefined =>
  /^\d{2}$/.test(code) ? getRegion(BY_PLATE_CODE[Number(code) - 1] as string) : undefined

/**
 * Region of a KATO code (any length ≥ 2; only the first two digits are used).
 * @example
 * regionByKato('751110000')?.id // 'almaty'
 */
export const regionByKato = (code: string): Region | undefined =>
  /^\d{2}/.test(code) ? REGIONS.find((r) => r.katoPrefix === code.slice(0, 2)) : undefined
