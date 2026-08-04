---
"@codeminity/axios": patch
"@codeminity/fetch": patch
---

Fix `handleRetry` propagating an exception thrown by a caller's own `shouldRetry`/`getRetryDelay`, which replaced the original failure and skipped its `onEvent`/`onError` telemetry entirely. A broken `shouldRetry` now fails safe (treated as "don't retry"); a broken `getRetryDelay` now falls back to `retryDelay`/`0`, exactly as if either had returned its safe default.
