# Architecture

This document describes the internal design of `@codeminity/fetch`: its layers, dependency rules, and the reasoning behind them. It's aimed at contributors and at applications that want to understand what they're depending on.

---

## Table of Contents

- [Goals](#goals)
- [Layered Design](#layered-design)
- [Dependency Rules](#dependency-rules)
- [Package Structure](#package-structure)
- [Request Lifecycle](#request-lifecycle)
- [Instance Isolation](#instance-isolation)
- [Relationship to `@codeminity/axios`](#relationship-to-codeminityaxios)
- [Non-Goals](#non-goals)

---

## Goals

The package exists to bring the same request infrastructure `@codeminity/axios` provides — token attachment, refresh coordination, retry, error classification — to applications that use the native Fetch API instead of Axios, without adding a dependency or reinventing `fetch`'s own contract.

Design goals, in priority order:

1. **Fidelity to native `fetch`** — the function `createFetch` returns behaves exactly like `fetch` itself: same parameters, same "resolves with a `Response`, even a non-`ok` one" contract, same thrown-error cases (network failure, abort, timeout). Nothing about existing `fetch` usage should need to change to adopt this package beyond swapping which function you call.
2. **Predictability** — lifecycle behavior should be explicit and traceable, not implicit "magic."
3. **Composability** — lifecycle primitives (auth, retry, events) should be independently usable and independently testable.
4. **Thinness** — the adapter layer should contain as little logic as possible; real logic belongs in `@codeminity/request-core`.

## Layered Design

```text
┌──────────────────────────────┐
│         Application            │  business logic, API usage
└───────────────┬───────────────┘
                │
┌───────────────▼───────────────┐
│      @codeminity/fetch          │  Fetch integration, auth/retry orchestration
└───────────────┬───────────────┘
                │
┌───────────────▼───────────────┐
│      Fetch API (native)         │  HTTP client surface
└───────────────┬───────────────┘
                │
┌───────────────▼───────────────┐
│   @codeminity/request-core      │  auth lifecycle, refresh coordination,
│                                  │  retry orchestration, concurrency control
└───────────────┬───────────────┘
                │
┌───────────────▼───────────────┐
│         HTTP Transport          │  network layer
└──────────────────────────────┘
```

Each layer only talks to the layer directly below it. The application never reaches into `request-core` directly; `@codeminity/fetch` never implements lifecycle logic itself — it only translates native `fetch` calls into the primitives `request-core` understands.

## Dependency Rules

- `@codeminity/fetch` depends on `@codeminity/request-core` only. It has no dependency on `fetch` itself — the native global is used directly, exactly as any other code calling `fetch()` would.
- `@codeminity/fetch` **never** depends on application code, frameworks, or specific backend conventions.
- `@codeminity/request-core` has **no dependency** on this package (or on Axios) — it's transport-agnostic by design, which is what makes it reusable across adapters.
- Applications should depend only on the public export (`import { createFetch } from '@codeminity/fetch'`), never on internal modules.

This one-directional dependency graph is what keeps the system testable in isolation: `request-core` can be fully unit-tested without ever calling `fetch`, and `@codeminity/fetch` can be tested against a stubbed global `fetch`.

## Package Structure

```text
src/
├── index.ts        # public entry point
├── create.ts        # createFetch() factory, instance construction
├── auth/            # auth header creation, auth application, refresh dependency wiring
├── retry/           # retry decision logic and its config shape
├── errors/          # outcome classification, error event emission
├── shared/           # request orchestration (auth -> fetch -> retry -> events) and shared config shapes
└── mocks/           # test fixtures used across multiple features
```

Only the top-level package export is considered part of the public API. Everything under `src/` is an implementation detail and may be restructured between minor versions without notice.

## Request Lifecycle

A single call passes through the following stages:

```text
apiFetch(input, init)
   │
   ▼
Apply Auth              ← attaches auth (unless skipAuth), sets credentials for COOKIE mode
   │
   ▼
fetch(input, authedInit)
   │
   ▼
Classify Outcome         ← non-ok response or thrown error?
   │
   ▼
Retry?  ──yes──▶ (back to Apply Auth, next attempt)
   │no
   ▼
Emit Events              ← onEvent + onError, only on the final outcome
   │
   ▼
Resolve (Response, ok or not) or Reject (thrown error)
```

Unlike Axios, there's no interceptor pipeline to hook into — `fetch` is a plain function call, so one orchestrating function (`performRequest`) owns the whole per-call lifecycle: it reapplies auth on every attempt (so a token refreshed mid-retry is picked up), and only calls `onEvent`/`onError` once, on the attempt that ends the retry loop.

On the happy path (successful response, valid token), the only added cost over calling `fetch` directly is the auth-application step.

## Instance Isolation

Each `createFetch(config)` call gets its own closure over `config` and its own refresh queue (via `createRefreshQueue()` from `@codeminity/request-core`) — two instances are fully independent, with no shared mutable state, module-level singletons, or cross-instance coordination of any kind. There is no equivalent to Axios's default-export singleton exception (see `@codeminity/axios`'s `ARCHITECTURE.md#instance-isolation`) — there's no natural "default instance" for `fetch` to mimic (see [DECISIONS.md](./DECISIONS.md)), so every `createFetch()` call is isolated, full stop.

## Relationship to `@codeminity/axios`

Both packages are adapters over the same `@codeminity/request-core` lifecycle engine, translating a different transport's shape into the primitives `request-core` understands:

```text
@codeminity/axios      ──┐
@codeminity/fetch       ──┼──▶ @codeminity/request-core
(other adapters)        ──┘
```

They deliberately do **not** share transport-specific code with each other (retry config shapes, error event classification, header-attachment helpers are each implemented locally per adapter) — only `request-core`'s transport-agnostic primitives (`handleRefreshToken`, `createRefreshQueue`, `delay`, `TokenModeEnum`, `AuthConfig`, `RefreshQueue`) are shared. Whether any of the adapter-local logic should be promoted into `request-core` is a deliberate, separate evaluation (tracked in the project roadmap), not something either adapter should do unilaterally.

The two packages differ in one fundamental way worth calling out explicitly: `@codeminity/axios` throws on non-2xx responses (matching Axios's own contract); `@codeminity/fetch` resolves with the `Response` regardless of status (matching native `fetch`'s own contract). Each adapter is faithful to _its own_ transport's actual behavior rather than converging on one shared error contract — see [ADR-001](./DECISIONS.md#adr-001-mirror-native-fetchs-resolvethrow-contract-exactly).

## Non-Goals

To keep the scope of this package clear, it deliberately does **not**:

- implement authentication providers (OAuth flows, session storage, etc.)
- make assumptions about backend API conventions or error formats beyond HTTP status codes
- provide caching, request deduplication (outside of refresh coordination), or offline support
- add a `timeout` config option — use native `AbortSignal.timeout()` (see [DECISIONS.md](./DECISIONS.md))
- replace `fetch` or introduce a competing HTTP client API (no `.get`/`.post` convenience methods)

Anything in that list belongs in application code or in a separate, purpose-built package.
