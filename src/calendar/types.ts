export type HolidayId =
  | 'new-year'
  | 'orthodox-christmas'
  | 'womens-day'
  | 'constitution-day'
  | 'nauryz'
  | 'unity-day'
  | 'defender-day'
  | 'victory-day'
  | 'capital-day'
  | 'kurban-ait'
  | 'republic-day'
  | 'independence-day'

/** `religious` days off (7 January, Kurban ait) come from the Labour Code and never shift. */
export type HolidayType = 'state' | 'national' | 'religious'

export interface Holiday {
  id: HolidayId
  type: HolidayType
  name: { ru: string; kk: string; en: string }
}

/**
 * `holiday`: the holiday itself (also when it falls on a weekend);
 * `shift`: next working day after a holiday that fell on a weekend (holidays law, art. 5);
 * `transfer`: day off moved by a Labour Ministry order.
 */
export type DayOffKind = 'holiday' | 'shift' | 'transfer'

export interface DayOff {
  /** `YYYY-MM-DD` */
  date: string
  kind: DayOffKind
  /** For `holiday` and `shift`. */
  holiday?: Holiday
  /** For `transfer`: the weekend day that became a working day instead. */
  from?: string
}

export interface YearData {
  /** First day of Kurban ait, `YYYY-MM-DD` (announced yearly by the Muslim Spiritual Board). */
  kurbanAit?: string
  /** Labour Ministry transfers: `from` becomes a working day, `to` a day off. */
  transfers?: { from: string; to: string }[]
}

export interface CalendarOptions {
  /** Adds or replaces built-in data per year, e.g. `{ 2028: { kurbanAit: '2028-05-05', transfers: [] } }`. */
  years?: Record<number, YearData>
  /** Fail with `data` for years without both Kurban ait and transfer data. */
  strict?: boolean
}
