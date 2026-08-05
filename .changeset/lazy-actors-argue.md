---
"@codeminity/request-core": minor
"@codeminity/axios": patch
"@codeminity/fetch": patch
---

Cancel the retry backoff delay immediately when the request is aborted mid-wait, instead of waiting out the full delay before the abort is observed. `request-core`'s `delay()` now accepts an optional abort signal for this.
