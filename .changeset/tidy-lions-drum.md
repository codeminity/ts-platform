---
"@codeminity/axios": patch
"@codeminity/fetch": patch
---

Fix `shouldRetry` silently disabling the retry cap forever when `retries` resolves to `NaN` (reachable through ordinary type-correct arithmetic, e.g. a division by zero — no type-bypass needed). `attempt > NaN` is always `false` in JavaScript, so the retry budget never appeared exhausted. A `NaN` `retries` is now treated the same as an unconfigured one: zero, meaning "don't retry."
