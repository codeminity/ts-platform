---
"@codeminity/request-core": patch
---

Fix `refreshTimeout`'s TSDoc pointing to a broken `DECISIONS.md` anchor (`#adr-008-optional-refreshtoken-timeout`, which doesn't exist) instead of the real one (`#adr-008-optional-refreshtimeout`). Shipped as-is in the published `.d.ts` since it was introduced; no behavior change.
