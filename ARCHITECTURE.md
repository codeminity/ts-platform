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

## Apps

`apps/` holds internal, unpublished consumers of the packages — real proving grounds for the packages, not products this repo ships. An app is not a package: it's `"private": true`, has no version to publish, and isn't subject to the independent-publishability rule above. It still only ever depends on a package through that package's real `workspace:*` dependency and declared `exports` — the same module-resolution encapsulation described under Dependency Rules applies regardless of whether the consumer is a package or an app, so there's no separate enforcement rule needed for this boundary either.

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

`core → adapter` and circular dependencies are enforced automatically by [`dependency-cruiser`](https://github.com/sverweij/dependency-cruiser) (`pnpm run validate:deps`, run in CI) — see [`scripts/validate/validate-deps.ts`](./scripts/validate/validate-deps.ts). The rule matches any `packages/<category>/core/src` importing a sibling under that same `<category>`, so it covers both future adapters within an existing category and a `core` package inside any future category, without needing an update either time.

Deep internal package imports don't need a separate rule: each package's `package.json` `exports` field already makes anything outside `.`/declared subpaths unresolvable at the module-resolution level (Node's own package encapsulation) — there's nothing for a linter to additionally catch there.

---

## Package Layers

### Core Layer

Pure logic with no external integrations.

- no framework dependency
- no I/O concerns
- no UI-_framework_ concerns (no Vue/React/Angular component logic)

One package is the deliberate exception this last rule is written for: its entire purpose is building UI primitives themselves, not integrating with a specific UI framework — any thin translation layer it offers over those primitives is still not a separate adapter package. See that package's own ARCHITECTURE.md for why this doesn't violate the rule's actual intent.

### Adapter Layer

Integration layer for external systems.

- depends on core
- exposes public APIs

---

## Testing Infrastructure

- **Unit tests** live next to the code they test, inside each package's `src/`.
- **Real-browser (Playwright) end-to-end tests** live in each package's own `e2e/` — a sibling to `src/`, not inside it, since `vitest`'s own test discovery is scoped to `src/` and a `.spec.ts` file anywhere else under `packages/**` would otherwise collide with it. Shared harness code used across packages (fixtures, `playwright.config.ts`) lives at the repo root `e2e/`, the same role `scripts/` plays for cross-cutting tooling — neither is a package, so "tests live next to packages" doesn't apply to them.
- **`stryker.config.ts`** (repo root) runs mutation testing across every package's production code. Runs nightly via a scheduled CI workflow (`.github/workflows/mutation-nightly.yml`), not gated on individual PRs; `pnpm run test:mutation` runs the same full sweep on-demand locally, and `--mutate <file>` scopes a run to a single file for verifying a fix.

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

- no global mutable state — a package that genuinely needs a narrow, deliberate exception documents it in its own ARCHITECTURE.md/DECISIONS.md, not here
- state must be explicit and scoped

---

## Design Goal

ts-platform must remain:

- predictable
- composable
- framework-agnostic
- minimal in abstraction
