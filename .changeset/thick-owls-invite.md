---
'@codeminity/request-core': minor
'@codeminity/axios': minor
'@codeminity/fetch': minor
---

Warn once per origin when credentials (an `Authorization` header or a cookie in `COOKIE` mode) are about to be sent over a non-HTTPS connection, excluding loopback addresses (`localhost`, `127.0.0.1`, `::1`). Adds `isInsecureUrl` and `warnIfInsecureUrl` as new public exports from `@codeminity/request-core`; `@codeminity/axios` and `@codeminity/fetch` now call `warnIfInsecureUrl` internally before attaching credentials to a request.
