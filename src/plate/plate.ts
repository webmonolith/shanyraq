import type { PlateError } from '../core/errors'
import { err, ok, type Result } from '../core/result'
import { BY_PLATE_CODE } from '../regions/generated'
import type { RegionId } from '../regions/types'

/**
 * Plate series by MIA order No. 1040 (rev. 09.07.2026). `motorcycle` shares its format with
 * police trailers (type 5С); formats other than `individual`/`legalEntity` rest on a single sample.
 */
export type PlateType =
  | 'individual'
  | 'legalEntity'
  | 'motorcycle'
  | 'trailer'
  | 'transit'
  | 'police'
  | 'stateGuard'
  | 'protocol'
  | 'diplomatic'
  | 'honoraryConsul'
  | 'foreignBranch'
  | 'foreignParticipation'
  | 'foreigner'
  | 'armenia'

export interface PlateInfo {
  /** Canonical spelling as on the official samples: `237 BLM 01`, `D123 456`, `HC1234`. */
  value: string
  type: PlateType
  /** `01`–`20`, absent for series without a region. */
  regionCode?: string
  regionId?: RegionId
}

export interface PlateOptions {
  /** Only the canonical spelling: Latin capitals, official spacing. */
  strict?: boolean
}

type Format = [type: PlateType, pattern: RegExp, spaced: string]

// Compact (no separators) patterns; the last group, when two digits wide, is the region code.
const FORMATS: Format[] = [
  ['individual', /^(\d{3})([A-Z]{3})(\d{2})$/, '$1 $2 $3'],
  ['legalEntity', /^(\d{3})([A-Z]{2})(\d{2})$/, '$1 $2 $3'],
  ['motorcycle', /^(\d{2})([A-Z]{2})(\d{2})$/, '$1 $2 $3'],
  ['trailer', /^(\d{2})([A-Z]{3})(\d{2})$/, '$1 $2 $3'],
  ['transit', /^(\d{4})([A-Z]{2})$/, '$1 $2'],
  ['police', /^(\d{3,4})(\d{2})$/, '$1 $2'],
  ['stateGuard', /^(\d{3})(SK)$/, '$1 $2'],
  ['protocol', /^(PROTOCOL)$/, '$1'],
  ['diplomatic', /^([DT]\d{2,3})(\d{3})$/, '$1 $2'],
  ['honoraryConsul', /^(HC\d{4})$/, '$1'],
  ['foreignBranch', /^(M\d{3})(\d{3})$/, '$1 $2'],
  ['foreignParticipation', /^(H)(\d{3,4})(\d{2})?$/, '$1 $2 $3'],
  ['foreigner', /^(F)(\d{4})(\d{2})$/, '$1 $2 $3'],
  ['armenia', /^(A)(\d{4})(\d{2})$/, '$1 $2 $3'],
]

const REGION_CODE: Partial<Record<PlateType, true>> = {
  individual: true,
  legalEntity: true,
  motorcycle: true,
  trailer: true,
  police: true,
  foreignParticipation: true,
  foreigner: true,
  armenia: true,
}

// Cyrillic letters that look like Latin plate letters; the order text itself spells НС, М, Н in Cyrillic.
const CYRILLIC = 'АВЕКМНОРСТХУ'
const LATIN = 'ABEKMHOPCTXY'

const SEPARATORS = /[\s\-‐-―−.]/g

const normalize = (input: string): string =>
  input
    .toUpperCase()
    .replace(SEPARATORS, '')
    .replace(/[АВЕКМНОРСТХУ]/g, (c) => LATIN[CYRILLIC.indexOf(c)] as string)

/**
 * Parses a Kazakhstan licence plate (2012+ standard): series, canonical spelling, region.
 * @example
 * parsePlate('237blm01') // { ok: true, value: { value: '237 BLM 01', type: 'individual', regionCode: '01', regionId: 'astana' } }
 */
export const parsePlate = (
  input: string,
  options: PlateOptions = {},
): Result<PlateInfo, PlateError> => {
  if (typeof input !== 'string') return err('format')
  const s = normalize(input)
  for (const [type, pattern, spaced] of FORMATS) {
    const m = pattern.exec(s)
    if (!m) continue
    const value = s.replace(pattern, spaced).trim()
    if (options.strict && input !== value) return err('format')
    const info: PlateInfo = { value, type }
    const code = REGION_CODE[type] && m[m.length - 1]
    if (code && code.length === 2) {
      const regionId = BY_PLATE_CODE[Number(code) - 1]
      if (!regionId) return err('region')
      info.regionCode = code
      info.regionId = regionId
    }
    return ok(info)
  }
  return err('format')
}

/**
 * True when `input` is a valid licence plate (see {@link parsePlate}).
 * @example
 * isValidPlate('389 BK 01') // true
 */
export const isValidPlate = (input: string, options?: PlateOptions): boolean =>
  parsePlate(input, options).ok
