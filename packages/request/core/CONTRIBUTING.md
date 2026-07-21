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

```ts
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

```ts
pnpm changeset
```

---

## Build & Validation

#### Before pushing:

```ts
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
