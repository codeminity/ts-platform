---
"@codeminity/request-core": minor
---

Add an optional `refreshTimeout` (milliseconds) to `AuthConfig`. Without it, a `refreshToken` that never settles hangs every request waiting on that refresh forever, with no error and no event. When set, `refreshToken()` races against a timer and fails the refresh (routing through the normal `onRefreshFail`/`onEvent`/`onError` path) if it doesn't settle in time. Unset by default — nothing changes unless you opt in. Available through `@codeminity/axios`'s and `@codeminity/fetch`'s `codeminity.refreshTimeout` too, since both inherit `AuthConfig`.
