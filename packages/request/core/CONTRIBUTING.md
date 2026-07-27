# Contributing to @codeminity/request-core

Thank you for contributing to Codeminity.

This package is part of a strict monorepo architecture and follows explicit design rules to maintain stability and predictability.

---

## Development Rules

### 1. Public API only

Only export from `src/index.ts` or `src/test-utils.ts` — these are the package's two published entry points (`.` and `./test-utils`).

❌ Do not export from internal files directly.

---

### 2. No cross-package imports

Do not import internal files from other packages:

```text
❌ ../../other-package/src/internal
```

✔ public package imports only

---

### 3. Test requirements

All new features must include unit tests using Vitest.

- Factory-based mocks only
- No auto-mocking
- No any
- Deterministic async behavior

## Contract safety

Do not break public API without changeset.

Use:

```bash
pnpm changeset
```

Every export reachable from `src/index.ts` needs a real TSDoc summary and a release tag (`@public`/`@internal`/etc.) — `pnpm verify:packages` runs API Extractor in strict mode (no `--local`) and fails on undocumented exports, missing release tags, or a report that's out of sync with the code. If it fails because you intentionally changed the public API, update `etc/request-core.api.md` to match by running `pnpm exec api-extractor run --local` inside this package and committing the result — don't work around the failure any other way.

---

## Build & Validation

#### Before pushing:

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm validate:api
```

---

## Mental model

This package is not about HTTP.

It is about request flow orchestration.
