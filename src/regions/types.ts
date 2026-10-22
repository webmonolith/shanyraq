import type { BY_PLATE_CODE } from './generated'

export type RegionId = (typeof BY_PLATE_CODE)[number]

export interface Region {
  id: RegionId
  /** `city`: city of republican significance. */
  kind: 'city' | 'region'
  /** Official ru/kk names from KATO; en is common usage, not official. */
  name: { ru: string; kk: string; en: string }
  /** Administrative centre, Russian spelling as in KATO (`Қонаев`). */
  center: string
  /** `01`–`20`, licence plate region code (MIA order No. 1040). */
  plateCode: string
  /** First two digits of KATO codes in the region. */
  katoPrefix: string
  /** 9-digit KATO code of the region itself. */
  katoCode: string
}
