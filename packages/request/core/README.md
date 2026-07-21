# @codeminity/request-core

[![npm version](https://img.shields.io/npm/v/@codeminity/request-core.svg)](https://www.npmjs.com/package/@codeminity/request-core)
[![license](https://img.shields.io/npm/l/%40codeminity%2Frequest-core.svg)](../../../LICENSE)
[![build](https://img.shields.io/github/actions/workflow/status/codeminity/ts-platform/ci.yml)](https://github.com/codeminity/ts-platform/actions)

This package provides the foundational logic for managing request-related workflows such as authentication lifecycle, retry coordination, and safe concurrency control.

It is intentionally framework-agnostic and does not implement any HTTP client itself. It is currently consumed by [`@codeminity/axios`](../axios).

---

## Overview

`@codeminity/request-core` is responsible for handling the internal mechanics of request orchestration, including:

- Authentication state management
- Token expiration handling
- Refresh token coordination
- Request retry strategies
- Safe concurrency control for async operations

It is designed to be consumed by higher-level adapters and should not be used directly as a request client.

---

## Who Should Use This

**Nobody, directly.** This package is the internal engine behind Codeminity's own transport adapters — [`@codeminity/axios`](../axios) today, with `fetch`/`undici`/`graphql-request` adapters planned. Application developers should install and use an adapter package instead; this one has no HTTP client of its own and isn't a useful dependency on its own.

If you're building a **new adapter** inside this ecosystem, this is the package you depend on:

```bash
pnpm add @codeminity/request-core
```

## Example: how an adapter wires this in

```ts
import { createRefreshQueue, handleRefreshToken, TokenModeEnum } from '@codeminity/request-core'

const refreshQueue = createRefreshQueue()

await handleRefreshToken(
  {
    tokenMode: TokenModeEnum.BEARER,
    getToken: async () => localStorage.getItem('token'),
    isTokenExpired: async () => isExpired(localStorage.getItem('token')),
    refreshToken: async () => {
      const token = await refreshFromServer()
      localStorage.setItem('token', token)
    }
  },
  refreshQueue
)
```

This is the primitive that transport adapters (like `@codeminity/axios`) wire into their own request/response interceptors — see [its ARCHITECTURE.md](../axios/ARCHITECTURE.md) for how that wiring works in practice.

---

## Test Utilities

For adapter packages that need to test against this package's config shapes, factory-based mocks are published separately so `vitest` never ends up in the main production bundle:

```ts
import { createAuthConfig, createRefreshQueue } from '@codeminity/request-core/test-utils'
```

---

## Design Principles

### Separation of concerns

This package does not perform network requests.  
It only defines the logic required to manage request flows.

### Deterministic behavior

All async flows are predictable and testable, with no hidden side effects.

### Single responsibility

Each utility solves one well-defined problem and remains composable.

### No runtime assumptions

No dependency on any HTTP library, framework, or execution environment.

---

## Core Responsibilities

### Authentication lifecycle

Handles logic around:

- token validation
- expiration checks
- refresh triggering

### Refresh coordination

Ensures that concurrent refresh operations are handled safely by queueing execution and preventing duplicate refresh calls.

### Async control utilities

Provides utilities for:

- delaying execution
- controlling async flow
- ensuring predictable sequencing

---

## Key Abstractions

### Refresh Queue

A mechanism that ensures only one refresh operation runs at a time.

Subsequent requests are queued and resolved when the active operation completes.

### Token Handling Flow

Defines a structured flow:

1. Check if token exists
2. Check if token is expired
3. Trigger refresh if needed
4. Prevent duplicate refresh calls during concurrent execution

### Safe Async Execution

Utilities that ensure async tasks behave predictably under concurrency.

---

## API Surface

The package exposes a minimal and stable API:

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

**`@codeminity/request-core/test-utils`** (separate subpath, for adapter test suites only)

- `createAuthConfig`
- `createRefreshQueue` (mock, distinct from the real one above)

These primitives are designed to be composed into higher-level request systems.

---

## Mental Model

Instead of thinking in terms of HTTP libraries, think in flows:

- Is the token still valid?
- If not, should it be refreshed?
- Is a refresh already running?
- Should this request wait or continue?

This package provides the primitives to express those rules clearly.

---

## Testing Strategy

This package is fully covered using **Vitest**.

Testing principles:

- Factory-based mocks (no auto-mocking)
- Deterministic async behavior
- Fake timers only when necessary
- Strict TypeScript safety (no `any`)
- Clear separation of unit concerns

---

## Constraints

This package explicitly avoids:

- HTTP client implementation
- Framework-specific integrations
- Global state
- Hidden async behavior
- Opinionated request pipelines

---

## Usage Scope

This is a **low-level infrastructure package**.

It is intended to be used by adapters such as:

- HTTP clients
- Fetch wrappers
- Custom request engines

It should not be used directly in application-level code.

---

---

## Documentation

- [Architecture](./ARCHITECTURE.md)
- [Decisions](./DECISIONS.md)
- [Changelog](./CHANGELOG.md)

## Contributing

Contributions are welcome. Before opening a pull request, please read [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT
