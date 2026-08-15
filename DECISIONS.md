# Architecture Decisions (ts-platform)

This document records significant design decisions for the monorepo as a whole — decisions specific to one package live in that package's own `DECISIONS.md` instead (e.g. [`packages/request/axios/DECISIONS.md`](./packages/request/axios/DECISIONS.md)). Uses a lightweight ADR (Architecture Decision Record) format: **Context → Decision → Consequences**. New entries should be appended, not inserted, so this file reads as a timeline.

---

## Index

- [ADR-001: Factory-based mocks, no auto-mocking](#adr-001-factory-based-mocks-no-auto-mocking)
- [ADR-002: ESM-only, no CommonJS build](#adr-002-esm-only-no-commonjs-build)
- [ADR-003: Independently versioned and published packages](#adr-003-independently-versioned-and-published-packages)
- [ADR-004: Minimal abstraction principle](#adr-004-minimal-abstraction-principle)
- [ADR-005: Dependency architecture enforcement via programmatic API](#adr-005-dependency-architecture-enforcement-via-programmatic-api)
- [ADR-006: Real-browser testing over DOM simulation](#adr-006-real-browser-testing-over-dom-simulation)
- [ADR-007: Mutation testing scope](#adr-007-mutation-testing-scope)
- [ADR-008: Property-based testing scope](#adr-008-property-based-testing-scope)
- [ADR-009: Explicit `.js` extensions for relative imports](#adr-009-explicit-js-extensions-for-relative-imports)
- [ADR-010: DOM globals scoped to the `ui-kit` category only](#adr-010-dom-globals-scoped-to-the-ui-kit-category-only)
- [ADR-011: Static mutants ignored in mutation testing](#adr-011-static-mutants-ignored-in-mutation-testing)

---

## ADR-001: Factory-based mocks, no auto-mocking

**Context:** Auto-mocking (e.g. `vi.mock()` with automatic module replacement) hides which dependencies a test actually exercises, and can silently change behavior when the mocked module's shape changes without the test failing — the test keeps passing against a mock that no longer matches reality.

**Decision:** Every mock across every package is created explicitly through factory functions, never generated automatically. Shared factories (e.g. `@codeminity/request-core/test-utils`) are published so adapter packages reuse the same fixtures instead of each writing their own.

**Consequences:** What's mocked and why is visible at the call site, and a test failure points at a real behavioral mismatch rather than a stale auto-mock. The cost is slightly more setup code per test than auto-mocking would need.

## ADR-002: ESM-only, no CommonJS build

**Context:** Shipping both ESM and CommonJS builds (dual-package) doubles the build/test surface per package and reintroduces the exact interop pitfalls (`require()` of an ESM-only dependency, dual-package hazard with duplicated module state) that a clean ESM boundary avoids.

**Decision:** Every package ships `"type": "module"` with a single `import` condition in `exports`. There is no CommonJS build, and none is planned — this is a permanent design choice, not a temporary gap.

**Consequences:** Simpler bundling, better tree-shaking, and one build target per package instead of two. The tradeoff, made deliberately: `require('@codeminity/axios')` does not work — CommonJS consumers need a dynamic `import()`, documented in each package's [COMPATIBILITY.md](./COMPATIBILITY.md#module-system).

## ADR-003: Independently versioned and published packages

**Context:** A single monorepo version for every package (lockstep versioning) forces an unrelated package to bump its version — and consumers to review a changelog entry that doesn't concern them — whenever any other package in the repo changes.

**Decision:** Each package is versioned, changelogged, and published independently via Changesets, scoped to only the packages an actual change touches.

**Consequences:** A fix in `@codeminity/fetch` doesn't force a version bump on `@codeminity/axios` or vice versa, and each package's changelog only contains changes that actually affect it. The cost is that contributors need to run `pnpm changeset` and correctly scope it to the affected package(s) — an omitted or over-broad changeset is a real category of mistake this setup makes possible, caught by `validate:changeset` in CI.

## ADR-004: Minimal abstraction principle

**Context:** It's tempting to generalize a pattern the first time it appears twice, but a premature abstraction built from two data points is a guess about a third that may never arrive in the shape assumed.

**Decision:** Abstraction is introduced only when duplication is proven (not merely anticipated) and the resulting complexity is real and measurable — not when it looks like it might be useful later. Prefer explicit, duplicated implementation until a genuine third case justifies the shared abstraction.

**Consequences:** The codebase sometimes contains small, deliberate duplication (e.g. `@codeminity/axios` and `@codeminity/fetch` each implementing their own status-to-event mapping — see [`request-core`'s ADR-007](./packages/request/core/DECISIONS.md#adr-007-http-status-classification-stays-adapter-local)) rather than a shared abstraction built ahead of a proven need. This is intentional: removing that duplication later, once a real third case exists, is a smaller and safer change than un-generalizing a wrong abstraction would be.

## ADR-005: Dependency architecture enforcement via programmatic API

**Context:** [`dependency-cruiser`](https://github.com/sverweij/dependency-cruiser)'s standard configuration format is a `.dependency-cruiser.cjs`/`.mjs` file, which would be the one non-TypeScript config file in a repo where every other config is a `.ts` file with full typecheck/lint coverage.

**Decision:** Dependency rules are defined in [`scripts/validate-deps.ts`](./scripts/validate-deps.ts) using `dependency-cruiser`'s Node API (`cruise()`) instead of its config-file format.

**Consequences:** The dependency rules get the same typecheck and lint coverage as any other source file, and stay consistent with the rest of the repo's all-TypeScript tooling. The tradeoff is a slightly less common setup than most `dependency-cruiser` users run, so contributors extending it need to read `validate-deps.ts` rather than looking up a config-file example.

## ADR-006: Real-browser testing over DOM simulation

**Context:** Browser-dependent behavior (e.g. `@codeminity/axios`'s `COOKIE` auth mode) needs to be verified against real cookie-jar and same-origin-policy behavior. Neither `happy-dom` nor `jsdom` implements a real cookie jar or same-origin policy — they can only confirm that a property got set, not that a browser would actually behave the claimed way.

**Decision:** Browser-dependent behavior is verified with Playwright against a real Chromium browser (`e2e/browser/`), not a simulated DOM.

**Consequences:** Tests prove actual cross-origin credentialed behavior, not just that code ran without throwing. This is slower than a simulated-DOM unit test and requires a real browser in CI, which is why it's kept as its own `e2e/` suite alongside — not a replacement for — the fast unit-test layer. Firefox/WebKit coverage is a real, tracked gap (see [COMPATIBILITY.md](./COMPATIBILITY.md#browsers)), not a claim that this decision covers every engine already.

## ADR-007: Mutation testing scope

**Context:** A hand-picked list of files to mutation-test silently misses new concurrency-critical code added under an unfamiliar filename, and needs a config edit every time a package is added. Separately, `scripts/` (this repo's own build/release/validation tooling) is also unit-tested with Vitest and counted toward `test:coverage`'s 100% bar — the question is whether it should be held to the same mutation-testing bar as the packages themselves.

**Decision:** Stryker's `mutate` glob in [`stryker.config.ts`](./stryker.config.ts) covers every published package's production code (`packages/**/src`), using the same shape as `vitest.config.ts`'s own coverage `include`/`exclude` for that directory — new packages need zero config changes here. `scripts/` is deliberately **not** included, even though it's unit-tested and coverage-gated identically to the packages. It runs on-demand (`pnpm run test:mutation`), not on every CI run.

**Consequences:** New package code is mutation-tested automatically with no config edits needed. `scripts/` gets ordinary Vitest coverage (including 100% thresholds) but not the extra mutation-testing bar — a deliberate scope decision, not an oversight: this tooling is never published or consumed by anyone outside this repo, so a subtle logic gap here (unlike one in the refresh queue or retry orchestration) can't reach an external consumer, and doesn't carry the same cost to leave to ordinary example-based tests and code review. Full-repo mutation testing reruns the suite once per generated mutant, which doesn't scale to run on every push as package count grows — kept local/on-demand for that reason, not because the signal matters less for the packages it does cover. Stryker also runs against a dedicated [`vitest.mutation.config.ts`](./vitest.mutation.config.ts) (not the main `vitest.config.ts`) narrowed to `packages/**/src` tests only, so `scripts/`'s own ~20 test files don't rerun on every single generated mutant for no reason — this cut a full local run from ~62s to ~39s.

## ADR-008: Property-based testing scope

**Context:** Example-based tests prove specific cases work; they don't prove a rule holds across the range of inputs no one thought to write an example for. Adding `fast-check` everywhere would be excessive for code with no real invariant to sweep (orchestration/wiring code, for instance, has sequencing to test, not a mathematical property).

**Decision:** `fast-check` tests (`*.property.test.ts`, alongside the regular `*.test.ts` for the same file) are added deliberately, for functions with a real invariant across a wide input space: boundary conditions (`shouldRetry`'s `attempt`/`retries` comparison), classification tables (status-code → event mapping), value-preserving transforms (header construction), and concurrency coalescing (`createRefreshQueue`).

**Consequences:** Property tests found real issues example-based tests missed — a `Response` status-range constraint the test didn't account for, and a native `Headers`/`AxiosHeaders` whitespace-trimming behavior, both caught by generated inputs no manually-written example happened to include. A failing property means the rule doesn't hold, not that the test infrastructure is unreliable — `fast-check` shrinks every failure to a minimal, reproducible counterexample, so this doesn't conflict with the "no flaky tests" rule in [CONTRIBUTING.md](./CONTRIBUTING.md#testing-rules).

## ADR-009: Explicit `.js` extensions for relative imports

**Context:** `tsc --emitDeclarationOnly` (each package's `build:types` script) copies a relative import specifier into the published `.d.ts` essentially verbatim. The monorepo's own dev-facing `tsconfig.base.json` uses `moduleResolution: "Bundler"`, which treats extensions as optional, so neither `pnpm run typecheck` nor `pnpm run build` can ever catch a missing one. A real consumer using `moduleResolution: "NodeNext"`/`"node16"` (the correct setting for an actual Node.js app) requires the extension to resolve a relative specifier at all — without it, resolution silently degrades to an unresolved type instead of a hard compiler error, so even the consumer's own `tsc --noEmit` stays silent; only type-aware ESLint (`@typescript-eslint/no-unsafe-*`) surfaces the fallout, as an unrelated symptom far from the real cause. This shipped silently in `@codeminity/axios`, `@codeminity/fetch`, and `@codeminity/request-core` until a real NodeNext consumer surfaced it.

**Decision:** Every relative import/export in `packages/**/src` (e.g. `import { create } from './create.js'`) carries an explicit `.js` extension, checked by `pnpm run validate:node-resolution` (`tsc -p tsconfig.esm-strict.json --noEmit`, `moduleResolution: "NodeNext"`).

**Consequences:** Published `.d.ts` output resolves correctly for NodeNext consumers, and a regression is caught in CI before it ships rather than discovered downstream. `tsconfig.esm-strict.json` is a separate, dedicated tsconfig scoped to `packages/**/src` only, not a change to `tsconfig.base.json` itself — flipping the whole monorepo's resolution mode would also demand fixing every relative import in `bench/`, `e2e/`, and `scripts/`, none of which ship in a published package or are affected by a downstream consumer's resolution mode.

## ADR-010: DOM globals scoped to the `ui-kit` category only

**Context:** `ui-kit`'s packages are Web Components (Lit) — the first category whose production code needs a DOM at all. Every other package here is Node-oriented request/auth logic with no DOM dependency, and two existing mechanisms assumed that: `vitest.config.ts`'s single global `environment: 'node'`, and `scripts/verify-package.ts`'s runtime-import check, which spawns a bare `node index.mjs` to confirm a packed tarball actually imports cleanly — Lit's `LitElement` base class and `customElements.define()` reference `HTMLElement`/`customElements` at module-load time, which throws in plain Node with no DOM present.

**Decision:** `vitest.config.ts` keeps its single `environment: 'node'` default, unchanged; a `ui-kit` test file opts into `happy-dom` per file via a `// @vitest-environment happy-dom` comment (Vitest 4 dropped `environmentMatchGlobs`, which would have scoped this by path in one place — this per-file comment is the mechanism Vitest 4 actually still supports). `verify-package.ts` detects a `ui-kit`-category package by path and, only for those, installs `@happy-dom/global-registrator` into the scratch consumer and prepends `import '@happy-dom/global-registrator/register.js'` to the generated `index.mjs` before importing the package under test.

**Consequences:** `packages/request/**` keeps `node` and a plain-Node import check exactly as before — zero risk of regression there. `verify-package.ts`'s path-based scoping covers any future DOM-dependent category automatically; the Vitest side does not — each new `ui-kit` test file needs its own `// @vitest-environment happy-dom` comment, a real (small) cost accepted because Vitest 4 doesn't offer a path-based alternative anymore.

## ADR-011: Static mutants ignored in mutation testing

**Context:** Lit's `static properties`/`static styles` (see `ui-kit/core`'s own ADR-002) are this repo's first genuinely module-load-time static class fields — `request/*` never had this pattern. Stryker can't use its normal per-test incremental rerun for mutations to that kind of code, making them disproportionately slow: 15 static mutants (3% of the total mutant count) were observed consuming 45% of total mutation-testing run time.

**Decision:** `stryker.config.ts` sets `ignoreStatic: true`, so Stryker no longer generates mutants for static/module-load-time code at all.

**Consequences:** Mutation testing runtime dropped back to a normal range, same motivation as the existing `vitest.mutation.config.ts` split (ADR-007). The direct side effect: any file whose _entire_ content is static (a module-level `const` assignment or object literal with no conditionals, comparisons, or other mutable runtime logic — e.g. `ui-kit/core/src/theme/tokens.ts`, `request-core/src/auth/dependencies.ts`, `request/axios/src/create-configured-axios.ts`) now shows `0` total mutants (`n/a` score) in the mutation report, not because it's untested, but because there's nothing left for Stryker to mutate there at all. Ordinary Vitest coverage (100%, gated separately) is what verifies these files; a `n/a` row in the mutation report is expected for genuinely static files and isn't a coverage gap to chase.
