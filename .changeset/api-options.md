---
"shanyraq": minor
---

API review before 1.0: the year is an option everywhere (`mrpToTenge(10, { year: 2026 })`, `vatThreshold({ year })`, `birthAllowance`, `careAllowance`, `basicPension`, `agePension`, `registrationFee`); `vacationPay(earnings, start, { days })`; `effectiveRate(received, flows, { decimals })`; `gesvLimit` is renamed to `effectiveRateCap(kind, date, { ltv })` and `GesvLoanKind` to `RateCapKind`.
