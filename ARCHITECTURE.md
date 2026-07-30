# ts-platform Architecture

This document defines the structural rules of the ts-platform monorepo.

---

## System Design

ts-platform is a monorepo of independent, composable packages.

Each package:

- has a single responsibility
- is independently buildable
- is independently publishable
- does not depend on internal implementation of other packages

---

## Dependency Rules

### Allowed

- adapter → core
- packages → utilities

### Not Allowed

- core → adapter
- deep internal package imports
- circular dependencies

### Enforcement

`core → adapter` and circular dependencies are enforced automatically by [`dependency-cruiser`](https://github.com/sverweij/dependency-cruiser) (`pnpm run validate:deps`, run in CI) — see [`scripts/validate-deps.ts`](./scripts/validate-deps.ts). The rule matches any `packages/<category>/core/src` importing a sibling under that same `<category>`, so it covers both future adapters within an existing category and a `core` package inside any future category, without needing an update either time.

Deep internal package imports don't need a separate rule: each package's `package.json` `exports` field already makes anything outside `.`/declared subpaths unresolvable at the module-resolution level (Node's own package encapsulation) — there's nothing for a linter to additionally catch there.

---

## Package Layers

### Core Layer

Pure logic with no external integrations.

- no framework dependency
- no I/O concerns
- no UI concerns

### Adapter Layer

Integration layer for external systems.

- depends on core
- exposes public APIs

---

## Testing Infrastructure

- **Unit tests** live next to the code they test, inside each package's `src/`.
- **`e2e/`** (repo root) holds real-browser (Playwright) tests — deliberately outside any single package, since it's a shared harness meant to serve every package that has browser-dependent behavior, not just the first one that needed it.
- **`stryker.config.ts`** (repo root) runs mutation testing across every package's production code, on-demand (`pnpm run test:mutation`), not CI-gated.

## Public API Rule

Only `exports` defined in `package.json` are public.

Deep imports are forbidden.

---

## Async Model

- deterministic execution
- explicit control of concurrency
- no hidden async side effects

---

## State Rule

- no global mutable state, with one documented exception: `@codeminity/axios`'s default export intentionally shares Axios's own global `.defaults`/`.interceptors` for parity with plain Axios — see [Instance Isolation](./packages/request/axios/ARCHITECTURE.md#instance-isolation). Anything created via `axios.create()` is fully isolated.
- state must be explicit and scoped

---

## Design Goal

ts-platform must remain:

- predictable
- composable
- framework-agnostic
- minimal in abstraction
