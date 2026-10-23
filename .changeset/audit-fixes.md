---
"shanyraq": patch
---

Fixes from a module audit:
- `dismissalPay`: severance that ends in a shorter month now ends on its last day (30.03 → 30.04, not 29.04).
- `grossFromNet`: returns the smallest gross even where separate rounding of ОПВ and ВОСМС makes net dip.
- `claimDuty`, `registrationFee`, `recyclingFee`, `propertyValue`, `landTax`: keys such as `'toString'` are rejected instead of throwing or returning NaN.
- `effectiveRate`: flows all on day 0 return `range`.
- `moneyToWords`: half a tiyn rounds up for numbers too (1.005 → 1 тиын).
- CLI: `--add -3` and `--seed -1` work.
- `vehicle.range` texts mention volume and mass.
