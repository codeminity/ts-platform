---
"@codeminity/request-core": minor
"@codeminity/axios": minor
"@codeminity/fetch": minor
---

Automatically honor a `Retry-After` response header when retrying (supports both the numeric-seconds and HTTP-date forms), boosting the delay whenever it asks for longer than the configured `retryDelay` would otherwise wait, capped at 5 minutes. No configuration needed — a configured `getRetryDelay` still fully overrides this, same as any other backoff customization. `@codeminity/request-core` gains a new `resolveRetryDelay` export used internally by both adapters to reconcile a configured delay with a suggested one.
