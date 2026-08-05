---
"@codeminity/request-core": patch
"@codeminity/axios": patch
"@codeminity/fetch": patch
---

Stop shipping test-file type declarations (`*.test.d.ts`) in the published npm tarball. `build:types` now uses a dedicated `tsconfig.build-types.json` that excludes `*.test.ts` — `typecheck` is unaffected and still checks test files as before. No runtime or type-surface change for consumers; the tarball is just smaller and no longer leaks the internal test-file layout.
