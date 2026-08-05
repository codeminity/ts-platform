# @codeminity/request-core

> The framework-agnostic request lifecycle engine behind Codeminity's HTTP adapters — no HTTP client of its own.

[![npm version](https://img.shields.io/npm/v/@codeminity/request-core.svg)](https://www.npmjs.com/package/@codeminity/request-core)
[![license](https://img.shields.io/npm/l/%40codeminity%2Frequest-core.svg)](https://github.com/codeminity/ts-platform/blob/main/LICENSE)
[![build](https://img.shields.io/github/actions/workflow/status/codeminity/ts-platform/ci.yml)](https://github.com/codeminity/ts-platform/actions)

`@codeminity/request-core` implements the transport-independent parts of a request lifecycle — authentication state, refresh coordination under concurrency, retry decisions, and event classification — so that an HTTP adapter only has to translate its own transport's request/response shape into these primitives, instead of reimplementing the lifecycle itself.

```ts
import { createRefreshQueue, handleRefreshToken, TokenModeEnum } from '@codeminity/request-core'

declare function isExpired(token: string | null): boolean
declare function refreshFromServer(): Promise<string>

const refreshQueue = createRefreshQueue()

await handleRefreshToken(
  {
    tokenMode: TokenModeEnum.JWT,
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

This is the primitive that transport adapters wire into their own request/response interceptors — see [`@codeminity/axios`'s ARCHITECTURE.md](../axios/ARCHITECTURE.md#request-lifecycle) or [`@codeminity/fetch`'s ARCHITECTURE.md](../fetch/ARCHITECTURE.md#request-lifecycle) for how each one wires it in practice.

---

## Table of Contents

- [Who Should Use This](#who-should-use-this)
- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Emitting Events](#emitting-events)
- [Test Utilities](#test-utilities)
- [Design Constraints](#design-constraints)
- [Testing Strategy](#testing-strategy)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Who Should Use This

**Not application code, directly.** This package is the internal engine behind Codeminity's HTTP adapters — [`@codeminity/axios`](../axios) and [`@codeminity/fetch`](../fetch) are both built on it today. Application developers should install and use one of those adapter packages instead; this package has no HTTP client of its own and isn't a useful dependency by itself.

If you're building a **new adapter** for this ecosystem — for an HTTP client, a GraphQL client, or anything else with an authenticated-request lifecycle — this is the package you depend on.

## Installation

```bash
pnpm add @codeminity/request-core
```

## Core Concepts

**Token handling flow.** Every authenticated request follows the same shape regardless of transport: check whether a token exists, check whether it's expired, trigger a refresh if needed, and avoid triggering a second refresh while one is already in flight. `handleRefreshToken` implements this flow once so no adapter has to reimplement it.

**Refresh queue.** `createRefreshQueue()` guarantees that only one refresh operation runs at a time. If five requests discover an expired token simultaneously, only one `refreshToken` call is made; the other four await the same in-flight refresh instead of triggering four redundant (and potentially conflicting) refresh calls. See [DECISIONS.md](./DECISIONS.md) for why this is a queue rather than a simpler in-flight boolean flag.

**Event classification.** `emitterCallback` is the shared plumbing of an adapter's error-event pipeline. The adapter still owns classifying its own transport's failure into an event name — mapping an HTTP status code, a GraphQL error code, or a WebSocket close code is transport-specific and stays in the adapter, not here (see [Design Constraints](#design-constraints)).

## API Reference

**Functions**

- `handleRefreshToken` — runs the token-check → refresh → continue flow described above
- `createRefreshQueue` — creates a queue guaranteeing a single in-flight refresh
- `delay` — a promise-based delay utility used by retry backoff
- `emitterCallback` — shared error-event emission plumbing
- `isInsecureUrl` — returns whether a URL would carry credentials over a non-HTTPS, non-loopback connection
- `warnIfInsecureUrl` — logs a one-time-per-origin `console.warn` when `isInsecureUrl` is true

**Objects**

- `dependencies` — `handleRefreshToken` re-exported through a mutable object, so adapter test suites can spy on it without mocking the whole module

**Enums**

- `TokenModeEnum`
- `ErrorEventEnum`

**Types**

- `TokenMode`
- `AuthConfig`
- `RefreshQueue`
- `RetryConfig`
- `EventCallbacks`

## Emitting Events

```ts
import { emitterCallback, type EventCallbacks } from '@codeminity/request-core'

interface MyOutcome {
  status?: number
  error?: unknown
}

declare const callbacks: EventCallbacks<string, MyOutcome>
declare const outcome: MyOutcome
declare const event: string

await emitterCallback(event, outcome, callbacks)
```

## Test Utilities

For adapter packages that need to test against this package's config shapes, factory-based mocks are published separately so `vitest` never ends up in the main production bundle:

```ts
import { createAuthConfig, createRefreshQueue } from '@codeminity/request-core/test-utils'
```

## Design Constraints

This package is deliberately narrow in scope: no HTTP client dependency, no framework dependency, no global state, no protocol-specific vocabulary (HTTP status codes, GraphQL error codes, and similar stay adapter-local), and fully deterministic async behavior. See [ARCHITECTURE.md](./ARCHITECTURE.md#design-constraints) for the full list and the reasoning behind each constraint.

## Testing Strategy

Covered with Vitest using factory-based mocks (no auto-mocking), deterministic async behavior, strict TypeScript (no `any`), and fake timers only where a test genuinely needs to control elapsed time.

## Documentation

- [Architecture](./ARCHITECTURE.md)
- [Decisions](./DECISIONS.md)
- [Changelog](./CHANGELOG.md)

## Contributing

Contributions are welcome. Before opening a pull request, please read [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
