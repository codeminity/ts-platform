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
- [ADR-008: Optional `refreshTimeout`](#adr-008-optional-refreshtimeout)
- [ADR-009: `delay()`'s abort signal is an inline structural type](#adr-009-delays-abort-signal-is-an-inline-structural-type)
- [ADR-010: `Retry-After` reconciliation is generic; parsing stays adapter-local](#adr-010-retry-after-reconciliation-is-generic-parsing-stays-adapter-local)
- [ADR-011: Retry-delay jitter lives in `request-core`](#adr-011-retry-delay-jitter-lives-in-request-core)

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

---

## ADR-008: Optional `refreshTimeout`

**Context:** `handleRefreshToken` awaited `refreshToken()` with no time bound. A `refreshToken` that never settles (a hung network request, a dropped connection with no timeout of its own) left every request funneled through that `RefreshQueue` waiting forever, with no error, no event, and no way for the adapter's existing failure handling to ever run.

**Decision:** `AuthConfig` gains an optional `refreshTimeout` (milliseconds). When set, `refreshToken()` races against a timer; if the timer wins, the refresh is treated as failed with a timeout error, which flows through the exact same failure path (`onRefreshFail`, then the adapter's own `onEvent`/`onError`) as any other `refreshToken` rejection. Unset by default — nothing times out unless explicitly configured, consistent with this package having no automatic behavior a caller didn't opt into.

**Consequences:** A hung `refreshToken` now surfaces as a normal, catchable failure instead of an invisible, permanent hang — at the cost of one new public config field. This can't rescue a `refreshToken` that blocks the event loop synchronously (no timer fires until the event loop is free); it only helps when `refreshToken` returns a promise that simply never settles, which is the realistic failure mode for a network-backed refresh.

## ADR-009: `delay()`'s abort signal is an inline structural type

**Context:** `delay()` (used for retry backoff) previously always waited out its full duration, so aborting a request mid-backoff wasn't observed until the delay finished. Fixing this means `delay()` needs to accept some form of abort signal — but the adapters carry it as different types with different strictness (a real DOM/Node `AbortSignal` on the fetch side, a looser shape with optional `addEventListener`/`removeEventListener` on the axios side), and no adapter or caller ever needs to name this type directly — each just passes its own already-typed signal value straight through.

**Decision:** `delay()`'s second parameter is typed as an inline anonymous shape (`aborted`, plus optional `addEventListener`/`removeEventListener`) rather than a named, exported interface. This was checked, not assumed: giving it a real name in its own file and leaving it unexported from `index.ts` still fails `verify:packages` (API Extractor's `ae-forgotten-export`, configured as an error here, fires for any type a `@public` signature references that isn't reachable from the entry point — regardless of whether the type itself has an `export` keyword in its own module). Exporting it from `index.ts` was the only alternative, and nothing warranted that: every real caller already has its own concretely-typed signal and structurally satisfies this shape without ever importing or naming it, and IDE hover/go-to-definition work the same either way, inline or named — TypeScript resolves both by following the module graph, not by what's reachable from the package root.

**Consequences:** `request-core` stays adapter-agnostic per [ADR-001](#adr-001-no-http-client-dependency) — it never imports a specific HTTP client's types or assumes DOM lib types are available, consistent with [ADR-005](#adr-005-no-runtime-or-framework-assumptions). Keeping the type inline also holds the line on [ADR-004](#adr-004-minimal-strict-public-api-surface)'s minimal-surface rule: nothing was added to the public API surface just to satisfy the type checker. Because `addEventListener`/`removeEventListener` are typed optional, `delay()` degrades gracefully (falls back to a plain timer) against any signal-like value that doesn't support them, rather than requiring every caller to prove it has a fully-featured `AbortSignal`.

## ADR-010: `Retry-After` reconciliation is generic; parsing stays adapter-local

**Context:** `@codeminity/axios` and `@codeminity/fetch` both needed to honor a server-suggested wait time (an HTTP `Retry-After` header) when retrying, boosting the delay whenever it asks for longer than the configured `retryDelay`. The first implementation put a `parseRetryAfter(headerValue: string | null | undefined)` function directly in `request-core`, reasoning that its signature was generic. On review, this repeated the exact mistake [ADR-007](#adr-007-http-status-classification-stays-adapter-local) already ruled out for HTTP status classification: a generic-looking _type signature_ doesn't make a _concept_ protocol-agnostic. The `Retry-After` header's wire format (numeric-seconds or an RFC 9110 HTTP-date string) is HTTP-specific — a gRPC `RetryInfo` or any other transport's equivalent wait-hint doesn't arrive as this string shape at all, so a function that parses it is exactly the kind of protocol-specific knowledge `request-core` (which backs any transport, not just HTTP — see ADR-001, ADR-005) shouldn't own.

**Decision:** Split the feature at the same seam ADR-007 draws. `request-core` exports `resolveRetryDelay(configuredDelay, suggestedDelayMs?, maxDelayMs?)` — genuinely protocol-agnostic: it only ever compares two already-resolved millisecond numbers, takes the larger, and caps the result. It has no idea whether `suggestedDelayMs` came from an HTTP header, a gRPC error detail, or anything else. Parsing the raw wire-format string into that plain millisecond number stays in each HTTP adapter's own `parse-retry-after.ts`, duplicated identically between `@codeminity/axios` and `@codeminity/fetch` — matching ADR-007's existing duplication of HTTP status-to-event mapping.

**Consequences:** Two small, independently-duplicated pieces of HTTP-specific code (status classification and `Retry-After` parsing) now live between the two adapters instead of one. This is intentional, not an oversight this ADR failed to catch: ADR-007's own resolution already anticipated exactly this — "if a second HTTP-based adapter ever needs the same status-to-event table, the right move is a small dedicated shared package that only HTTP-based adapters depend on." That trigger (a third HTTP-based adapter, beyond axios and fetch) hasn't happened yet. When it does, both duplicated concerns should move into that shared package together, not just this one — and this ADR should be revisited/superseded at that point rather than left describing a decision that no longer holds.

## ADR-011: Retry-delay jitter lives in `request-core`

**Context:** Following `Retry-After` support (ADR-010), both adapters also needed jitter — randomizing the default retry delay so many clients failing at once don't all retry in lockstep ("thundering herd"). ADR-010 drew a firm line: a generic-looking type signature doesn't make a concept protocol-agnostic, and HTTP-specific _wire formats_ (`Retry-After`'s header string) must stay adapter-local. Jitter needed checking against that same test before assuming it belonged in `request-core` just because `resolveRetryDelay` already lives there.

**Decision:** Unlike `Retry-After` parsing, jitter passes ADR-010's test cleanly: `applyRetryJitter(delayMs: number, jitter?: 'none' | 'full' | 'equal')` operates purely on an already-resolved millisecond number and a randomization strategy — it has no wire format to parse, no HTTP (or any transport's) vocabulary baked into what it does. "Take a duration and randomize it" is exactly as protocol-agnostic as `delay()` waiting out a duration, or `resolveRetryDelay` comparing two of them. It lives in `request-core`, exported alongside `resolveRetryDelay`, and `RetryConfig.retryJitter` is defined in the shared base interface (`packages/request/core/src/retry/retry-config.interface.ts`) next to `retries`/`retryDelay`, not duplicated per adapter.

**Consequences:** Any future adapter — HTTP-based or not — gets thundering-herd protection for free by threading its own resolved default delay through `applyRetryJitter`, with zero protocol-specific code to duplicate. This is the contrast case that makes ADR-010's line concrete: two features shipped back to back, one HTTP-specific (stayed adapter-local), one genuinely generic (went into core) — the deciding question is always "does this need to know anything about the transport," not "is the type signature generic."
