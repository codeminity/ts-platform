---
"@codeminity/request-core": patch
"@codeminity/axios": patch
"@codeminity/fetch": patch
---

Improve npm/SEO metadata: `homepage` now points to each package's own subfolder README instead of the generic monorepo root, and `keywords` now cover real feature-search terms (`jwt`, `token-refresh`, `retry-logic`, `rate-limit`, `api-client`, `http-client`) alongside the existing category terms. No code or behavior changes.
