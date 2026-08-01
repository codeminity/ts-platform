# Architecture Decisions (ts-platform)

This document records key architectural decisions.

---

## No Auto Mocking

Auto-mocking is not allowed.

### Reason:

- reduces test clarity
- introduces hidden behavior
- harms maintainability

---

## Factory-Based Mocks

All mocks must be created explicitly using factory functions.

### Benefits:

- deterministic tests
- full control over behavior
- type safety

---

## ESM Only

ts-platform is ESM-only.

### Reason:

- modern ecosystem alignment
- better tree-shaking
- simpler bundling

---

## Independent Packages

Each package is independently versioned and published.

### Reason:

- scalability
- flexibility
- reduced coupling

---

## Minimal Abstraction Principle

Abstraction is allowed only when:

- duplication is proven
- complexity is real and measurable

Otherwise prefer explicit implementation.

---

## Dependency Architecture Enforcement via Programmatic API

`dependency-cruiser`'s rules are defined in [`scripts/validate-deps.ts`](./scripts/validate-deps.ts) using its Node API (`cruise()`), not a `.dependency-cruiser.cjs`/`.mjs` config file.

### Reason:

- the tool has no `.ts` config file support — a config file would be the one non-TypeScript config in the repo
- a `.ts` script gets the same typecheck/lint coverage as any other source file

---

## Real-Browser Testing over DOM Simulation

Browser-dependent behavior (e.g. `@codeminity/axios`'s `COOKIE` auth mode) is verified with Playwright against a real Chromium browser, not `happy-dom`/`jsdom`.

### Reason:

- neither `happy-dom` nor `jsdom` implements a real cookie jar or same-origin policy — they can't actually prove cross-origin credentialed behavior, only that a property got set
- future storage-heavy packages will need real `indexedDB`/storage APIs, which DOM simulators don't accurately implement either

---

## Mutation Testing Scope

Stryker's `mutate` glob in [`stryker.config.ts`](./stryker.config.ts) mirrors `vitest.config.ts`'s own coverage `include`/`exclude` — every package's production code, not a hand-picked file list.

### Reason:

- a hand-picked list silently misses new concurrency-critical code under an unfamiliar filename
- a glob covering every source file stays correct as new packages are added, with no config edits
- kept as an on-demand local command, not CI-gated, since it reruns the suite once per generated mutant — full-repo mutation testing on every push doesn't scale as package count grows

---

## Property-Based Testing Scope

`fast-check` tests (`*.property.test.ts`, alongside the regular `*.test.ts` for the same file) are added deliberately, not everywhere — chosen for functions with a real invariant across a wide input space: boundary conditions (`shouldRetry`'s `attempt`/`retries` comparison), classification tables (status-code → event mapping), value-preserving transforms (header construction), and concurrency coalescing (`createRefreshQueue`). Orchestration/wiring code (interceptor registration, factory functions) isn't a target — there's no invariant to sweep, just sequencing already covered by example-based tests.

### Reason:

- example-based tests prove specific cases work; property tests prove a _rule_ holds across a range no one would hand-write examples for
- found real issues immediately: a `Response` status-range constraint the test didn't account for, and a native `Headers`/`AxiosHeaders` whitespace-trimming behavior — both caught by generated inputs no manually-written example happened to include
