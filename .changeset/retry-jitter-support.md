---
"@codeminity/request-core": minor
"@codeminity/axios": minor
"@codeminity/fetch": minor
---

Add an opt-in `retryJitter` config (`'none'` | `'full'` | `'equal'`, default `'none'`) that randomizes the default retry delay to avoid many clients retrying in lockstep after the same failure ("thundering herd"). Only affects the default delay computation — a configured `getRetryDelay` remains a full override, unaffected by jitter. `@codeminity/request-core` gains a new `applyRetryJitter` export used internally by both adapters.
