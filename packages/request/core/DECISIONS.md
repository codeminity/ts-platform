# Architecture Decisions

This document records significant design decisions for `@codeminity/request-core`, using a lightweight ADR (Architecture Decision Record) format: **Context → Decision → Consequences**. New entries should be appended, not inserted, so this file reads as a timeline.

---

## Index

- [ADR-001: No HTTP client dependency](#adr-001-no-http-client-dependency)
- [ADR-002: Queue-based refresh coordination](#adr-002-queue-based-refresh-coordination)
- [ADR-003: Factory-based mocks, no auto-mocking](#adr-003-factory-based-mocks-no-auto-mocking)
- [ADR-004: Minimal, strict public API surface](#adr-004-minimal-strict-public-api-surface)
- [ADR-005: No runtime or framework assumptions](#adr-005-no-runtime-or-framework-assumptions)
- [ADR-006: No global state](#adr-006-no-global-state)
- [ADR-007: HTTP status classification stays adapter-local](#adr-007-http-status-classification-stays-adapter-local)

---

## ADR-001: No HTTP client dependency

**Context:** A request lifecycle engine could be built as a plugin for one specific HTTP client (Axios, `fetch`, or otherwise), which would make the implementation simpler but would tie it permanently to that client's request/response shape.

**Decision:** `@codeminity/request-core` takes no dependency on any HTTP client, or on HTTP at all as a protocol. Its primitives (`handleRefreshToken`, `createRefreshQueue`, `delay`, `emitterCallback`) operate on plain data shapes an adapter provides, not on a specific client's types.

**Consequences:** The same engine backs `@codeminity/axios` and `@codeminity/fetch` today without either adapter forking the lifecycle logic — see [`@codeminity/axios`'s ARCHITECTURE.md](../axios/ARCHITECTURE.md#extending-to-other-transports). The tradeoff is that this package can't offer any transport-specific convenience (like classifying an HTTP status code) without breaking that independence — see [ADR-007](#adr-007-http-status-classification-stays-adapter-local).

## ADR-002: Queue-based refresh coordination

**Context:** Concurrent requests discovering an expired token at the same time is a common source of race conditions. A naive implementation (each request checks the token, sees it's expired, and calls `refreshToken` independently) triggers redundant refresh calls and can leave the app in an inconsistent state if two refresh responses arrive out of order.

**Decision:** `createRefreshQueue()` serializes refresh execution: the first caller to discover an expired token starts the refresh; every other caller that arrives while it's in flight awaits that same operation instead of starting its own.

**Consequences:** Refresh is safe under arbitrary concurrency without the adapter having to reason about it. The cost is one extra layer of indirection between "token expired" and "token refreshed" — a caller waiting on the queue can't distinguish "my own refresh is running" from "someone else's is," which is the correct behavior but occasionally surprises new contributors reading the code for the first time.

## ADR-003: Factory-based mocks, no auto-mocking

**Context:** Auto-mocking (e.g. `vi.mock()` with automatic module replacement) hides which dependencies a test actually exercises, and can silently change behavior when the mocked module's shape changes without the test failing.

**Decision:** All mocks in this package's own tests, and the mocks published via `@codeminity/request-core/test-utils` for adapter packages, are created explicitly through factory functions (`createAuthConfig`, `createRefreshQueue`) rather than generated automatically.

**Consequences:** Tests stay readable — what's mocked and why is visible at the call site — at the cost of slightly more setup code per test than auto-mocking would require. Adapter packages get the same factories instead of each writing their own, which keeps test fixtures consistent across the ecosystem.

## ADR-004: Minimal, strict public API surface

**Context:** A permissive public surface (exporting everything under `src/`) makes internal refactors a breaking change by accident, since any file could be something a consumer imported directly.

**Decision:** Only `src/index.ts` and `src/test-utils.ts` are public (enforced by `package.json` `exports` and checked by API Extractor in CI — see [ARCHITECTURE.md](./ARCHITECTURE.md#public-api)). Everything under `src/auth/`, `src/retry/`, `src/errors/` is free to change between minor versions.

**Consequences:** Internal restructuring doesn't require a major version bump, which keeps the package's version number meaningful. The cost is that adapter authors occasionally want something that isn't exported yet and have to request it explicitly rather than reaching into an internal module — which is the intended friction, not an oversight.

## ADR-005: No runtime or framework assumptions

**Context:** This package needs to run wherever an adapter needs it to — Node.js, browsers, and edge runtimes all have real, current adapter or planned-adapter use cases, and each has different global APIs available.

**Decision:** No API in this package assumes a specific runtime global (`window`, `document`, Node's `process`, and similar) or a specific framework's lifecycle.

**Consequences:** The same build works unmodified across every environment an adapter targets. This does mean genuinely runtime-specific behavior (like `@codeminity/axios`'s browser-only `COOKIE` token mode) has to live in the adapter, not here — which is consistent with [ADR-001](#adr-001-no-http-client-dependency)'s reasoning.

## ADR-006: No global state

**Context:** Module-level mutable state is a common source of test pollution (one test's state leaking into another) and of surprising behavior when a package is used in more than one place in an application.

**Decision:** All state this package manages (refresh-in-flight status, queued callers) is scoped to the `RefreshQueue` instance the caller creates and holds, never stored at module scope — with one narrow, documented exception: `warnIfInsecureUrl`'s per-origin dedup cache (`warnedOrigins` in `src/auth/warn-insecure-url.ts`) is process-wide by design. Its job is "warn about this insecure origin once," which is a property of the _origin_, not of any particular caller — deduping per `RefreshQueue`/adapter instance instead would mean the same misconfigured `baseURL` re-warns once per client instance, which defeats the point of deduping at all.

**Consequences:** Multiple independent `RefreshQueue` instances never interfere with each other, and tests don't need to reset module state between runs. Adapters that want shared state across multiple client instances have to do so explicitly, by sharing one `RefreshQueue` — nothing here does it implicitly on their behalf. The one exception above means two unrelated adapter instances hitting the same insecure origin only produce one console warning between them, not two — intentional, not a leak. Because the state is module-scoped, tests exercising it use distinct origins per test case (see `warn-insecure-url.test.ts`) rather than resetting shared state between runs.

## ADR-007: HTTP status classification stays adapter-local

**Context:** `@codeminity/axios` and `@codeminity/fetch` each maintain a table mapping HTTP status codes to event names (`404` → `not_found`, and similar). This is genuinely duplicated between the two, which made it a candidate for promotion into `request-core`.

**Decision:** The mapping stays in each adapter. `request-core` exposes only `emitterCallback` as generic event-emission plumbing — it never defines what an "event" means for a specific transport.

**Consequences:** "HTTP status code" isn't a concept every consumer of this package shares — `request-core` backs any transport adapter, not just HTTP ones, and a `401` from a REST endpoint isn't the same shape of thing as an authorization failure surfaced through a GraphQL response body or a WebSocket close code. Forcing every consumer to see an HTTP-specific enum sitting next to `TokenModeEnum`, whether or not their transport even has status codes, would misrepresent this package as less protocol-agnostic than it actually is. If a second HTTP-based adapter ever needs the same status-to-event table `@codeminity/axios` and `@codeminity/fetch` already share, the right move is a small dedicated shared package that only HTTP-based adapters depend on (alongside `request-core`, not instead of it) — not folding HTTP-specific vocabulary into the one package every adapter, HTTP or not, has to depend on.
