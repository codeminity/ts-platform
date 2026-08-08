---
"@codeminity/request-core": minor
"@codeminity/axios": minor
"@codeminity/fetch": minor
---

`onRefreshFail` now receives a second argument, `retry: () => Promise<void>`, letting you retry a failed `refreshToken` call on transient failures without any new config. Call and `await` (or `return`) `retry()` to re-run `refreshToken` (racing the same `refreshTimeout`, if configured) — it resolves or rejects based on that attempt's real outcome. Not calling `retry()` behaves exactly as before. Fully backward compatible: an existing `onRefreshFail: (error) => void` implementation is unaffected.
