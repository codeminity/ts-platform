---
"@codeminity/axios": patch
"@codeminity/fetch": patch
---

Skip auth/token-refresh entirely on a retry attempt whose signal is already aborted, instead of spending a real `refreshToken()` call on a request that's already cancelled. This closes the remaining gap in the retry-backoff abort-cancellation fix: aborting mid-backoff now also avoids the wasted refresh work on the retry attempt that follows.
