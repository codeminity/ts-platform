# Architecture

This document describes the internal design of `@codeminity/request-core`: its layers, dependency rules, and the reasoning behind them. It's aimed at contributors and at anyone building a new adapter on top of this package.

---

## Table of Contents

- [Goals](#goals)
- [Core Layers](#core-layers)
- [Package Structure](#package-structure)
- [Data Flow](#data-flow)
- [Design Constraints](#design-constraints)
- [Public API](#public-api)
- [Concurrency Model](#concurrency-model)
- [Non-Goals](#non-goals)

---

## Goals

Every HTTP adapter that needs authenticated, retried requests ends up reimplementing the same three concerns: tracking whether a token is still valid, coordinating refresh so concurrent requests don't each trigger their own refresh call, and deciding when a failure is worth retrying. `@codeminity/request-core` implements these once, transport-agnostically, so an adapter only has to translate its own request/response shape into these primitives.

Design goals, in priority order:

1. **Transport independence** — no assumption about HTTP, GraphQL, WebSockets, or any specific client library. An adapter provides the translation; this package provides the logic.
2. **Determinism** — every async flow behaves predictably under concurrency, with no hidden side effects. This is what makes the refresh queue safe to rely on.
3. **Minimalism** — the public surface stays small and stable (see [Public API](#public-api)); new adapter needs get evaluated against whether they're genuinely transport-agnostic before anything is added here.

## Core Layers

### Authentication Layer

Token validation, expiration detection, and refresh triggering — the logic behind `handleRefreshToken`.

### Concurrency Layer

Ensures safe execution of async flows: prevents duplicate refresh calls, queues concurrent operations, and guarantees deterministic execution order — the logic behind `createRefreshQueue`.

### Timing Utilities

`delay` and other small async-coordination helpers used by retry backoff.

## Package Structure

```text
src/
├── index.ts          # public entry point
├── test-utils.ts      # public test-utils entry point (separate build, not bundled into index)
├── auth/             # token lifecycle, refresh coordination, auth config shape
│   └── mocks/        # factory-based mocks, re-exported via test-utils.ts
├── retry/            # retry config shape, delay utility
└── errors/           # error event classification enum
```

Only `src/index.ts` and `src/test-utils.ts` are considered part of the public API (see [Public API](#public-api)). Everything else is an implementation detail and may be restructured between minor versions without notice.

## Data Flow

A single authenticated call passes through the following stages, regardless of which adapter is driving it:

```text
Request
   │
   ▼
Check Token             ← does a token exist?
   │
   ▼
Is Expired?
   │
   ▼
Queue Refresh (if needed)   ← createRefreshQueue() ensures only one refresh runs
   │
   ▼
Continue Execution
```

The adapter is responsible for everything before and after this flow — sending the actual request, classifying the response into a retry/event decision — this package only owns the auth-and-refresh segment in the middle.

## Design Constraints

- No framework dependency
- No HTTP client dependency
- No protocol-specific vocabulary — event/outcome classification (HTTP status codes, GraphQL error codes, WebSocket close codes, and similar) stays adapter-local; see [DECISIONS.md](./DECISIONS.md)
- No global state, with one narrow exception (`warnIfInsecureUrl`'s per-origin dedup cache, intentionally process-wide) — see [DECISIONS.md](./DECISIONS.md#adr-006-no-global-state)
- Fully deterministic async behavior

## Public API

Only this surface is stable:

**Functions**

- `handleRefreshToken`
- `createRefreshQueue`
- `delay`
- `emitterCallback`
- `isInsecureUrl`
- `warnIfInsecureUrl`

**Objects**

- `dependencies`

**Enums**

- `TokenModeEnum`
- `ErrorEventEnum`

**Types**

- `TokenMode`
- `AuthConfig`
- `RefreshQueue`
- `RetryConfig`
- `EventCallbacks`

`@codeminity/request-core/test-utils` is a separate, published subpath export (`createAuthConfig`, `createRefreshQueue` mock) for adapter packages' own test suites — it is not part of the runtime API above and is never bundled into the main entry point.

Everything else is internal and may change.

## Concurrency Model

Only one refresh operation can run at a time per `RefreshQueue` instance. Subsequent calls made while a refresh is in flight are queued and resolved sequentially once it completes, rather than each triggering their own refresh.

## Non-Goals

To keep the scope of this package clear, it deliberately does **not**:

- send HTTP requests or implement any transport itself
- define HTTP-, GraphQL-, or protocol-specific vocabulary (status codes, error codes, close codes) — that classification is each adapter's own responsibility
- provide caching, request deduplication (outside of refresh coordination), or offline support
- expose configuration or APIs meant for application code — see [README.md](./README.md#who-should-use-this)

Anything in that list belongs in an adapter package or in application code.
