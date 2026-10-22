export type TaxRegime = 'general' | 'simplified' | 'selfEmployed' | 'farm' | 'individual'

/** Conditions a deadline depends on, e.g. `employees` — the payer has employees. */
export type DeadlineTag =
  | 'employees'
  | 'ip'
  | 'legal'
  | 'vat'
  | 'advances'
  | 'assets'
  | 'propertyAdvances'
  | 'income'
  | 'car'
  | 'home'

export interface Rule {
  id: string
  form?: string
  kind: 'report' | 'pay'
  /** Regime → tags that must all apply for the deadline to concern the payer. */
  regimes: Partial<Record<TaxRegime, string[]>>
  rule: {
    type: 'monthly' | 'inMonth' | 'quarterly' | 'halfYear' | 'annual' | 'fixed'
    day?: number
    month?: number
    plusDays?: number
    dates?: { md: string; year: number; from?: string; to?: string }[]
  }
}
