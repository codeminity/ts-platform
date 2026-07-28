# Architecture Decisions - request-core

## 1. Why no HTTP client?

We intentionally avoid coupling with any HTTP library to keep this package reusable across environments.

---

## 2. Why queue-based refresh handling?

Concurrent refresh requests are a common source of race conditions.

A queue ensures:

- single refresh execution
- predictable ordering
- no duplicated network calls

---

## 3. Why factory-based testing?

We avoid auto-mocking because:

- it hides real dependencies
- reduces test clarity
- introduces unpredictable behavior

Factories ensure deterministic tests.

---

## 4. Why strict public API?

We enforce a minimal surface area:

- easier maintenance
- safer versioning
- predictable ecosystem integration

---

## 5. Why no framework assumptions?

This package must remain usable in:

- Node.js
- browsers
- edge runtimes
- custom runtimes

---

## 6. Why no global state?

Global state introduces:

- hidden coupling
- race conditions
- unpredictable behavior under concurrency

All state is explicitly passed or scoped.

---

## 7. Why isn't HTTP status code classification here?

`@codeminity/axios` and `@codeminity/fetch` each maintain an identical table mapping HTTP status codes to event names (`404` → `not_found`, etc.). This was considered for promotion into `request-core`, since it's genuinely duplicated between the two — but rejected.

The reason isn't runtime cost — it's that "HTTP status code" isn't a concept every consumer of this package shares. `request-core` is meant to back *any* transport adapter, not just HTTP ones (`fetch`/`axios`/`undici` today; GraphQL, WebSocket, and others are plausible later). A `401` from a REST endpoint and an authorization failure surfaced through a GraphQL response body or a WebSocket close code aren't the same shape of thing, and forcing every consumer of this package to see an HTTP-specific enum sitting next to `TokenModeEnum` — whether or not their transport even has status codes — misrepresents this package as less protocol-agnostic than it actually is.

Event/outcome classification stays adapter-local. If a third HTTP-based adapter (e.g. `undici`) needs the same table, the right move is a small dedicated shared package that only HTTP-based adapters depend on (alongside `request-core`, not instead of it) — not folding HTTP-specific vocabulary into the one package every adapter, HTTP or not, has to depend on.
