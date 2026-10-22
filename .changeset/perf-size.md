---
"shanyraq": patch
---

`shanyraq/zod` bundles only the Russian messages of the schemas it uses (`{ iin }` 1.9 → 1.0 kB gzip). `countWorkingDays` counts weekdays arithmetically (≈3× faster on a year); `taxDeadlines` builds each calendar year once per call (≈8× faster). Benchmarks: `npm run bench`.
