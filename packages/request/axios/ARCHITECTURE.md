# Architecture

This document describes the internal design of `@codeminity/axios`: its layers, dependency rules, and the reasoning behind them. It's aimed at contributors and at applications that want to understand what they're depending on.

---

## Table of Contents

- [Goals](#goals)
- [Layered Design](#layered-design)
- [Dependency Rules](#dependency-rules)
- [Package Structure](#package-structure)
- [Request Lifecycle](#request-lifecycle)
- [Instance Isolation](#instance-isolation)
- [Extending to Other Transports](#extending-to-other-transports)
- [Non-Goals](#non-goals)

---

## Goals

The package exists to solve one problem: applications built on Axios tend to reimplement the same infrastructure — token attachment, refresh coordination, retry, error classification — over and over, usually as ad-hoc interceptors that are hard to test and easy to get subtly wrong (especially refresh race conditions).

`@codeminity/axios` centralizes that logic without taking away the Axios API developers already know.

Design goals, in priority order:

1. **Predictability** — lifecycle behavior should be explicit and traceable, not implicit "magic."
2. **Non-invasiveness** — the Axios API surface stays the same; nothing about existing Axios usage should need to change to adopt the package.
3. **Composability** — lifecycle primitives (auth, retry, events) should be independently usable and independently testable.
4. **Thinness** — the adapter layer should contain as little logic as possible; real logic belongs in `@codeminity/request-core`.

## Layered Design

```text
┌──────────────────────────────┐
│         Application            │  business logic, API usage
└───────────────┬───────────────┘
                │
┌───────────────▼───────────────┐
│      @codeminity/axios          │  Axios integration, interceptor wiring
└───────────────┬───────────────┘
                │
┌───────────────▼───────────────┐
│            Axios                │  HTTP client surface
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

Each layer only talks to the layer directly below it. The application never reaches into `request-core` directly; `@codeminity/axios` never implements lifecycle logic itself — it only wires Axios interceptors to lifecycle primitives exposed by `request-core`.

## Dependency Rules

- `@codeminity/axios` depends on `axios` and `@codeminity/request-core`.
- `@codeminity/axios` **never** depends on application code, frameworks, or specific backend conventions.
- `@codeminity/request-core` has **no dependency on Axios** — it's transport-agnostic by design, which is what makes it reusable across future adapters (`fetch`, `undici`, etc.).
- Applications should depend only on the public export (`import axios from '@codeminity/axios'`), never on internal modules.

This one-directional dependency graph is what keeps the system testable in isolation: `request-core` can be fully unit-tested without ever creating an Axios instance, and `@codeminity/axios` can be tested against a mocked `request-core`.

## Package Structure

```text
src/
├── handlers/       # translate request-core lifecycle events into Axios-facing behavior
├── interceptors/   # Axios request/response interceptors that call into handlers
├── factories/       # axios.create() wrapper, instance construction
└── utils/          # internal helpers (not part of the public API)
```

Only the top-level package export is considered part of the public API. Everything under `src/` is an implementation detail and may be restructured between minor versions without notice.

## Request Lifecycle

A single request passes through the following stages:

```text
API Call
   │
   ▼
Axios Instance
   │
   ▼
Request Interceptor        ← attaches auth (unless skipAuth), applies request-level config
   │
   ▼
Authentication / Lifecycle Handling
   │
   ▼
HTTP Request
   │
   ▼
Response Interceptor       ← classifies errors, decides on retry, emits events
   │
   ▼
Retry / Error Processing
   │
   ▼
Application Response
```

Retry and refresh are both "response interceptor" concerns: they only activate once a request has already failed. On the happy path (successful response, valid token), the only added cost is a single request interceptor call.

## Instance Isolation

Each Axios instance created via `axios.create()` gets its own `codeminity` configuration and its own lifecycle state (in-flight refresh tracking, retry counters). Two instances pointed at different `baseURL`s are fully independent of one another.

If your application creates **multiple instances against the same backend** and needs them to share a single in-flight refresh operation, don't assume that behavior — verify it against the specific version you have installed, since instance-scoping is exactly the kind of internal detail that can change between releases. When in doubt, prefer a single shared instance per backend rather than relying on cross-instance coordination.

## Extending to Other Transports

Because `@codeminity/request-core` has no Axios dependency, the same lifecycle engine can back other transport adapters:

```text
@codeminity/axios     ──┐
@codeminity/fetch      ──┼──▶ @codeminity/request-core
@codeminity/undici     ──┘
```

Each adapter would be responsible only for translating its transport's request/response shape into the primitives `request-core` understands — the auth, retry, and refresh logic would not need to be reimplemented.

## Non-Goals

To keep the scope of this package clear, it deliberately does **not**:

- implement authentication providers (OAuth flows, session storage, etc.)
- make assumptions about backend API conventions or error formats beyond HTTP status codes
- provide caching, request deduplication (outside of refresh coordination), or offline support
- replace Axios or introduce a competing HTTP client API

Anything in that list belongs in application code or in a separate, purpose-built package.
