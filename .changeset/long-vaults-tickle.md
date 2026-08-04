---
"@codeminity/axios": minor
---

`onError` now always fires alongside `onEvent` for every failed outcome, including classified HTTP failures — matching `@codeminity/fetch`'s and `@codeminity/request-core`'s existing contract. Previously, the auth path (refresh/token failures) treated `onEvent`/`onError` as mutually exclusive while the response-error path always fired both, silently disagreeing with itself. If you relied on `onError` only firing for non-Axios exceptions, it will now also fire for classified `AxiosError` failures — use the presence of an `onEvent` call (or its event name) to distinguish the two cases.
