# Architecture - @codeminity/request-core

## Overview

This package is a low-level orchestration engine for request lifecycle management.

It does NOT perform HTTP requests.

---

## Core Layers

### 1. Authentication Layer

Responsible for:

- token validation
- expiration detection
- refresh triggering

---

### 2. Concurrency Layer

Ensures safe execution of async flows:

- prevents duplicate refresh calls
- queues concurrent operations
- guarantees deterministic execution order

---

### 3. Timing Utilities

Provides utilities such as delay and async coordination helpers.

---

## Data Flow Model

Request
↓
Check Token
↓
Is Expired?
↓
Queue Refresh (if needed)
↓
Continue Execution

---

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

---

## Design Constraints

- No framework dependency
- No HTTP client dependency
- No global state
- Fully deterministic async behavior

---

## Public API

Only this surface is stable:

**Functions**

- `handleRefreshToken`
- `createRefreshQueue`
- `delay`

**Enums**

- `TokenModeEnum`
- `ErrorEventEnum`

**Types**

- `TokenMode`
- `AuthConfig`
- `RefreshQueue`
- `RetryConfig`

`@codeminity/request-core/test-utils` is a separate, published subpath export (`createAuthConfig`, `createRefreshQueue` mock) for adapter packages' own test suites — it is not part of the runtime API above and is never bundled into the main entry point.

Everything else is internal and may change.

---

## Concurrency Model

Only one refresh operation can run at a time.

Subsequent calls are queued and resolved sequentially.

---

## Philosophy

This package does not try to "send requests".

It ensures that request systems behave correctly under real-world concurrency and authentication constraints.
