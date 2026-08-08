# @codeminity/fetch

> A production-ready native Fetch adapter built on top of `@codeminity/request-core`.

[![npm version](https://img.shields.io/npm/v/@codeminity/fetch.svg)](https://www.npmjs.com/package/@codeminity/fetch)
[![license](https://img.shields.io/npm/l/%40codeminity%2Ffetch.svg)](https://github.com/codeminity/ts-platform/blob/main/LICENSE)
[![typescript](https://img.shields.io/badge/typescript-supported-blue.svg)](https://www.typescriptlang.org/)
[![build](https://img.shields.io/github/actions/workflow/status/codeminity/ts-platform/ci.yml)](https://github.com/codeminity/ts-platform/actions)

`@codeminity/fetch` wraps the native Fetch API with a deterministic request lifecycle powered by `@codeminity/request-core`: authentication orchestration, token refresh coordination, retry handling, and request lifecycle events — while preserving `fetch`'s own contract exactly (same parameters, same "always resolves with a `Response`" behavior).

```ts
import { createFetch } from '@codeminity/fetch'

declare function getToken(): string | null
declare function refresh(): Promise<void>

const apiFetch = createFetch({
  getToken,
  refreshToken: refresh,
  retries: 3
})

const res = await apiFetch('https://api.example.com/users')
const users: unknown = await res.json()
```

---

## Table of Contents

- [Overview](#overview)
- [Why @codeminity/fetch?](#why-codeminityfetch)
- [Features](#features)
- [Installation](#installation)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [Retry](#retry)
- [Events](#events)
- [Timeouts & Cancellation](#timeouts--cancellation)
- [Request Configuration](#request-configuration)
- [TypeScript](#typescript)
- [API Reference](#api-reference)
- [Examples](#examples)
- [FAQ](#faq)
- [Architecture](#architecture)
- [Guides](#guides)
- [Related Packages](#related-packages)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Applications using the native Fetch API tend to reimplement the same infrastructure — token attachment, refresh coordination, retry, error classification — over and over as ad-hoc wrapper functions, usually without handling the refresh race condition where several requests hit an expired token at once.

`@codeminity/fetch` centralizes that logic behind a function with the exact same shape as `fetch` itself.

## Why @codeminity/fetch?

- **Zero new API surface.** `createFetch(config)` returns a function you call exactly like `fetch(input, init)`. No `.get`/`.post` methods, no instance object to learn.
- **Native contract preserved.** Never throws for HTTP error statuses — resolves with the `Response`, exactly like plain `fetch`. Only throws for network failures, aborts, and timeouts.
- **No token refresh race conditions.** Concurrent requests hitting an expired token share a single in-flight refresh via `@codeminity/request-core`'s refresh queue.
- **Opt-in everything.** No retry, no auth header, no behavior at all unless you configure it — see [`@codeminity/request-core`'s design principles](../core/ARCHITECTURE.md#design-constraints).

## Features

### Fetch-Compatible API

`createFetch()` returns `(input: RequestInfo | URL, init?: FetchRequestInit) => Promise<Response>` — a strict superset of `fetch`'s own signature. Anywhere you'd call `fetch(...)`, you can call the returned function instead.

### Authentication Lifecycle

Attach a bearer token, check expiry, and coordinate refresh — all driven by callbacks you provide (`getToken`, `isTokenExpired`, `refreshToken`).

### Refresh Token Coordination

Multiple concurrent requests with an expired token trigger exactly one `refreshToken()` call; the rest wait for its result.

### Retry Handling

Configurable retry count, delay (fixed or computed per attempt), and decision logic (`retryOnStatuses` or a full custom `shouldRetry`).

### Request Lifecycle Events

`onEvent`/`onError` callbacks receive a classified event (`'network'`, `'timeout'`, `'not_found'`, etc.) and the outcome (`{ response?, error? }`) for every failed final attempt.

### TypeScript First

Strict types throughout, zero `any` in the public surface.

### Framework Agnostic

No dependency beyond `@codeminity/request-core`. Works anywhere the native `fetch` global is available (modern browsers, Node.js 18+, Deno, Cloudflare Workers, etc.).

## Installation

```bash
# pnpm
pnpm add @codeminity/fetch

# npm
npm install @codeminity/fetch

# yarn
yarn add @codeminity/fetch
```

## Requirements

- Node.js `^22.13.0 || >=24.0.0` (or any runtime with a global `fetch`, `Headers`, `Response`, and `DOMException`)
- TypeScript 5+ (recommended, not required)

## Quick Start

```ts
import { createFetch } from '@codeminity/fetch'

declare function getToken(): string | null

const apiFetch = createFetch({
  getToken
})

const res = await apiFetch('https://api.example.com/users')

if (!res.ok) {
  throw new Error(`Request failed: ${res.status}`)
}

const users: unknown = await res.json()
```

## Core Concepts

### Responsibility Separation

`@codeminity/request-core` owns _what_ the lifecycle rules are (when to refresh, how retries are coordinated). `@codeminity/fetch` owns _how_ those rules apply to a native `fetch` call (attaching a header, reading `response.status`, re-invoking `fetch`).

### Adapter Philosophy

`createFetch` doesn't try to be a new HTTP client. It's a thin function wrapping `fetch` — same parameters in, same `Response`-or-throw contract out, plus lifecycle behavior you opted into via `config`.

### Request Flow

```text
apiFetch(input, init)
   │
   ▼
Apply Auth
   │
   ▼
fetch(input, authedInit)
   │
   ▼
ok response? ──yes──▶ return it
   │no / threw
   ▼
Retry? ──yes──▶ (loop back to Apply Auth)
   │no
   ▼
Emit onEvent / onError, then resolve (response) or reject (error)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full picture.

## Configuration

### Instance-Level Configuration

Passed to `createFetch()`, applies to every call made through the returned function:

```ts
import { createFetch, TokenModeEnum } from '@codeminity/fetch'

declare function getToken(): string | null
declare function isExpired(): boolean
declare function refresh(): Promise<void>

const apiFetch = createFetch({
  tokenMode: TokenModeEnum.JWT,
  getToken,
  isTokenExpired: isExpired,
  refreshToken: refresh,
  retries: 2,
  retryOnStatuses: [502, 503, 504]
})
```

### Request-Level Configuration

Passed as `init.codeminity`, overrides `retries`/`retryDelay`/`skipAuth` for a single call:

```ts
import { createFetch } from '@codeminity/fetch'

declare const apiFetch: ReturnType<typeof createFetch>

await apiFetch('/reports/generate', {
  codeminity: { retries: 0 }
})
```

## Authentication

### Token-Based Authentication

```ts
import { createFetch } from '@codeminity/fetch'

const apiFetch = createFetch({
  getToken: () => localStorage.getItem('token')
})
```

`getToken` is called before each request that isn't marked `skipAuth`. If it resolves to a falsy value, no `Authorization` header is attached.

### Refresh Token Handling

```ts
import { createFetch } from '@codeminity/fetch'

declare function isExpired(): boolean
declare function doRefresh(): Promise<void>

const apiFetch = createFetch({
  getToken: () => localStorage.getItem('token'),
  isTokenExpired: isExpired,
  refreshToken: doRefresh
})
```

### Concurrent Refresh Protection

```text
Request A ─┐
Request B ─┼──▶ Refresh Token
Request C ─┘
```

Only one refresh operation runs per `createFetch` instance; the rest wait for the result and continue afterward.

### Cookie Authentication

```ts
import { createFetch, TokenModeEnum } from '@codeminity/fetch'

const apiFetch = createFetch({
  tokenMode: TokenModeEnum.COOKIE
})
```

Requests are configured with `credentials: 'include'`.

### Skipping Authentication

```ts
import { createFetch } from '@codeminity/fetch'

declare const apiFetch: ReturnType<typeof createFetch>

await apiFetch('/public/config', {
  codeminity: { skipAuth: true }
})
```

## Retry

### Basic Configuration

```ts
import { createFetch } from '@codeminity/fetch'

const apiFetch = createFetch({
  retries: 3,
  retryDelay: 500
})
```

### Retry Status Codes

```ts
import { createFetch } from '@codeminity/fetch'

const apiFetch = createFetch({
  retries: 2,
  retryOnStatuses: [502, 503, 504]
})
```

Network failures and `AbortSignal.timeout()`-triggered timeouts are retried by default even without `retryOnStatuses` — a manually-triggered abort (`AbortController.abort()`) is not.

### Custom Retry Logic

```ts
import { createFetch, type FetchOutcome } from '@codeminity/fetch'

function myShouldRetry(outcome: FetchOutcome, attempt: number): boolean {
  return outcome.response?.status === 429 && attempt <= 3
}

const apiFetch = createFetch({
  retries: 3,
  shouldRetry: myShouldRetry
})
```

When `shouldRetry` is provided, it is the sole decision-maker — `retryOnStatuses` and the built-in network/timeout classification are not consulted.

### Custom Retry Delay

```ts
import { createFetch, type FetchOutcome } from '@codeminity/fetch'

function backoff(attempt: number, _outcome: FetchOutcome): number {
  return 2 ** attempt * 100
}

const apiFetch = createFetch({
  retries: 3,
  getRetryDelay: backoff
})
```

### Jitter

```ts
import { createFetch } from '@codeminity/fetch'

const apiFetch = createFetch({
  retries: 5,
  retryDelay: 1000,
  retryJitter: 'equal' // or 'full' — randomizes retryDelay to avoid a thundering herd
})
```

Only affects the default delay computation — `getRetryDelay` is a full override, so exponential backoff needs its own jitter (see [docs/guides/retry.md](./docs/guides/retry.md#jitter)).

### `Retry-After` Support

A `Retry-After` response header is honored automatically, with no configuration needed — it boosts the delay whenever it asks for longer than `retryDelay` would otherwise wait, capped at 5 minutes. Setting `getRetryDelay` fully overrides this, same as any other backoff customization — see [docs/guides/retry.md](./docs/guides/retry.md#respecting-retry-after) for reading the header yourself in that case.

## Events

### Event Callback

```ts
import { createFetch, type ErrorEvent, type FetchOutcome } from '@codeminity/fetch'

function handleEvent(event: ErrorEvent, outcome: FetchOutcome): void {
  console.warn(
    event,
    outcome.response?.status ??
      (outcome.error instanceof Error ? outcome.error.message : outcome.error)
  )
}

const apiFetch = createFetch({
  onEvent: handleEvent
})
```

### Available Events

| Event                  | Trigger                                          |
| ---------------------- | ------------------------------------------------ |
| `network`              | Thrown `TypeError` (connection/DNS/CORS failure) |
| `timeout`              | `AbortSignal.timeout()` fired                    |
| `abort`                | `AbortController.abort()` was called manually    |
| `bad_request`          | HTTP 400                                         |
| `unauthorized`         | HTTP 401                                         |
| `forbidden`            | HTTP 403                                         |
| `not_found`            | HTTP 404                                         |
| `conflict`             | HTTP 409                                         |
| `unprocessable_entity` | HTTP 422                                         |
| `too_many_requests`    | HTTP 429                                         |
| `internal_error`       | HTTP 500                                         |
| `bad_gateway`          | HTTP 502                                         |
| `service_unavailable`  | HTTP 503                                         |
| `gateway_timeout`      | HTTP 504                                         |
| `auth_refresh_failed`  | `refreshToken()` threw                           |
| `auth_token_failed`    | `getToken()` threw                               |
| `unknown`              | Anything else                                    |

Events fire once, on the attempt that ends the retry loop — not on every intermediate retry.

## Timeouts & Cancellation

There's no `timeout` config option — use the platform's own `AbortSignal.timeout()`:

```ts
import { createFetch } from '@codeminity/fetch'

declare const apiFetch: ReturnType<typeof createFetch>

await apiFetch('/slow-endpoint', {
  signal: AbortSignal.timeout(5000)
})
```

This is classified as the `'timeout'` event (not `'abort'`) and is retried by default. See [ADR-002](./DECISIONS.md#adr-002-no-custom-timeout-config--classify-abortsignaltimeout-instead).

## Request Configuration

### Available Options

| Option       | Type      | Description                                   |
| ------------ | --------- | --------------------------------------------- |
| `skipAuth`   | `boolean` | Skip authentication handling for this request |
| `retries`    | `number`  | Maximum retry attempts for this request       |
| `retryDelay` | `number`  | Delay between retry attempts (ms)             |

Passed via `init.codeminity`; every other `RequestInit` field (`method`, `headers`, `body`, `signal`, ...) works exactly as it would with plain `fetch`.

## TypeScript

### Extending `RequestInit`

The per-call `codeminity` override lives on this package's own `FetchRequestInit` type (a superset of `RequestInit`) — no global type augmentation is needed or performed, unlike `@codeminity/axios`'s `AxiosRequestConfig` augmentation. See [ADR](./DECISIONS.md) and [`@codeminity/axios`'s CONTRIBUTING.md](../axios/CONTRIBUTING.md) for why the two adapters differ here.

### Recommended `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "lib": ["ES2022", "DOM"]
  }
}
```

## API Reference

### `createFetch(config?)`

Returns `(input: RequestInfo | URL, init?: FetchRequestInit) => Promise<Response>`.

### Codeminity Configuration

`Config` (passed to `createFetch`) combines:

- `AuthConfig` (re-exported from `@codeminity/request-core`): `tokenMode`, `getToken`, `isTokenExpired`, `refreshToken`, `refreshTimeout`, `onRefreshStart`, `onRefreshSuccess`, `onRefreshFail`
- `CallbackConfig`: `onEvent`, `onError`
- `RetryConfig`: `retries`, `retryDelay`, `retryOnStatuses`, `shouldRetry`, `getRetryDelay`

### Exports

```ts
import { createFetch, TokenModeEnum, ErrorEventEnum } from '@codeminity/fetch'

import type {
  AuthConfig,
  Config,
  CallbackConfig,
  RequestConfig,
  RetryConfig,
  FetchRequestInit,
  FetchOutcome,
  ErrorEvent
} from '@codeminity/fetch'
```

### Public API Stability

Only `src/index.ts`'s exports are stable. Everything under `src/auth`, `src/retry`, `src/errors`, `src/shared` is an internal implementation detail — see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Examples

### Basic API Client

```ts
import { createFetch } from '@codeminity/fetch'

const apiFetch = createFetch()

const res = await apiFetch('https://api.example.com/health')
```

### Authenticated Client With Refresh

```ts
import { createFetch } from '@codeminity/fetch'

declare function isExpired(): boolean
declare function doRefresh(): Promise<void>

const apiFetch = createFetch({
  getToken: () => localStorage.getItem('token'),
  isTokenExpired: isExpired,
  refreshToken: doRefresh,
  retries: 2
})

const res = await apiFetch('https://api.example.com/me')

if (res.ok) {
  const me: unknown = await res.json()
}
```

### Handling Non-OK Responses

```ts
import { createFetch } from '@codeminity/fetch'

declare const apiFetch: ReturnType<typeof createFetch>

const res = await apiFetch('/users/999')

if (res.status === 404) {
  // handle not-found
} else if (!res.ok) {
  throw new Error(`Unexpected status: ${res.status}`)
}
```

### Error Monitoring

```ts
import { createFetch, type ErrorEvent, type FetchOutcome } from '@codeminity/fetch'

declare const monitoring: { track: (name: string, data: Record<string, unknown>) => void }

function reportEvent(event: ErrorEvent, outcome: FetchOutcome): void {
  monitoring.track('api_error', { event, status: outcome.response?.status })
}

const apiFetch = createFetch({
  onEvent: reportEvent
})
```

## FAQ

**Does this throw on a 404 or 500?**
No — it resolves with the `Response`, exactly like plain `fetch`. Check `res.ok` or `res.status`.

**How do I set a timeout?**
Pass `signal: AbortSignal.timeout(ms)` in `init` — see [Timeouts & Cancellation](#timeouts--cancellation).

**Can I disable authentication for a single request?**
Yes: `apiFetch('/public', { codeminity: { skipAuth: true } })`.

**Can each `createFetch()` instance have different configuration?**
Yes — every call to `createFetch()` gets its own isolated config and refresh queue.

**Does this work in the browser?**
Yes — anywhere the native `fetch`, `Headers`, `Response`, `DOMException`, and (for timeouts) `AbortSignal.timeout` globals are available.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full layered design, dependency rules, and request lifecycle diagram, and [DECISIONS.md](./DECISIONS.md) for the ADRs behind this package's key design choices.

## Guides

- Authentication — [docs/guides/authentication.md](./docs/guides/authentication.md)
- Retry — [docs/guides/retry.md](./docs/guides/retry.md)
- Events — [docs/guides/events.md](./docs/guides/events.md)
- Advanced Patterns — [docs/guides/advanced-patterns.md](./docs/guides/advanced-patterns.md)

More guides will be added as the project evolves.

## Related Packages

- [`@codeminity/request-core`](../core) — the transport-agnostic lifecycle engine this package wraps
- [`@codeminity/axios`](../axios) — the equivalent adapter for Axios

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](../../../LICENSE).
