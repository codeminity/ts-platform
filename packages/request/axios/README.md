# @codeminity/axios

> A production-ready Axios adapter built on top of `@codeminity/request-core`.

[![npm version](https://img.shields.io/npm/v/@codeminity/axios.svg)](https://www.npmjs.com/package/@codeminity/axios)
[![license](https://img.shields.io/npm/l/%40codeminity%2Faxios.svg)](https://github.com/codeminity/ts-platform/blob/main/LICENSE)
[![typescript](https://img.shields.io/badge/typescript-supported-blue.svg)](https://www.typescriptlang.org/)
[![build](https://img.shields.io/github/actions/workflow/status/codeminity/ts-platform/ci.yml)](https://github.com/codeminity/ts-platform/actions)

`@codeminity/axios` extends the Axios developer experience with a deterministic request lifecycle powered by `@codeminity/request-core`. It provides authentication orchestration, token refresh coordination, retry handling, and request lifecycle events — while keeping the familiar Axios API.

```ts
import axios from '@codeminity/axios'

const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: {
    getToken: async () => localStorage.getItem('token'),
    refreshToken: async () => {
      /* refresh implementation */
    },
    retries: 3
  }
})

const { data } = await api.get('/users')
```

---

## Table of Contents

- [Overview](#overview)
- [Why @codeminity/axios?](#why-codeminityaxios)
- [Features](#features)
- [Installation](#installation)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [Retry](#retry)
- [Events](#events)
- [Request Configuration](#request-configuration)
- [TypeScript](#typescript)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Migration from Axios](#migration-from-axios)
- [Best Practices](#best-practices)
- [FAQ](#faq)
- [Performance](#performance)
- [Architecture](#architecture)
- [Guides](#guides)
- [Related Packages](#related-packages)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Modern applications need more than just an HTTP client. A production request layer usually needs to solve problems such as:

- authentication lifecycle management
- token refresh coordination
- retry strategies
- concurrent request handling
- consistent error processing
- predictable request behavior

Axios provides an excellent, familiar HTTP client experience, but these infrastructure concerns are usually reimplemented from scratch in every application. `@codeminity/axios` solves this by extending Axios with a dedicated request lifecycle layer, while keeping the original Axios API fully intact.

```text
Application
    │
    ▼
@codeminity/axios
    │
    ▼
Axios
    │
    ▼
HTTP Transport
```

| Layer                      | Responsibility                                   |
| -------------------------- | ------------------------------------------------ |
| Axios                      | HTTP communication and transport                 |
| `@codeminity/request-core` | Request lifecycle primitives and orchestration   |
| `@codeminity/axios`        | Integration layer between Axios and request-core |

`@codeminity/axios` is **not** a replacement for Axios. It's an infrastructure adapter that provides a reliable, consistent request lifecycle while letting you keep using the Axios API you already know.

---

## Why @codeminity/axios?

| Concern                       | Plain Axios                      | `@codeminity/axios`                               |
| ----------------------------- | -------------------------------- | ------------------------------------------------- |
| Token attachment              | Manual interceptor per project   | Built-in via `getToken`                           |
| Refresh token races           | Custom mutex/queue logic needed  | Handled automatically, one refresh in flight      |
| Retry logic                   | Hand-rolled response interceptor | Declarative config (`retries`, `retryOnStatuses`) |
| Error/lifecycle observability | Scattered `try/catch` blocks     | Centralized `onEvent` / `onError` callbacks       |
| Per-request overrides         | Ad-hoc config merging            | First-class `codeminity` request option           |
| TypeScript support            | Generic Axios types              | Augmented types for lifecycle config              |

If you've ever copy-pasted the same refresh-token interceptor between projects, this package is meant to replace that copy-paste with a tested, shared implementation.

---

## Features

### Axios-Compatible API

Use the familiar Axios API without introducing a new HTTP abstraction. Existing Axios knowledge transfers directly.

```ts
import axios from '@codeminity/axios'

const api = axios.create({ baseURL: 'https://api.example.com' })
const response = await api.get('/users')
```

### Authentication Lifecycle

Provides infrastructure support for authenticated requests:

- token retrieval
- token injection
- refresh token coordination
- cookie-based authentication flows

Authentication _implementation_ remains owned by your application — this package only provides the lifecycle.

### Refresh Token Coordination

Handles concurrent refresh scenarios safely. When multiple requests detect an expired token, only one refresh operation runs; the rest wait for the result. This prevents duplicate refresh calls and race conditions, and is powered by `@codeminity/request-core`.

### Retry Handling

Configurable retry infrastructure:

- retry count limits
- retry delays (fixed or custom backoff)
- status-based retry rules
- fully custom retry decisions

Retry behavior is explicit and predictable — nothing retries unless you configure it to.

### Request Lifecycle Events

Hooks for observing request lifecycle failures — network errors, timeouts, authentication failures, and HTTP status errors — so you can plug in your own logging, monitoring, or alerting.

### TypeScript First

Strict type definitions, exported configuration types, and Axios module augmentation for a predictable developer experience.

### Framework Agnostic

Works in Node.js, browsers, backend services, and any frontend framework. No framework-specific assumptions.

### Thin Adapter Architecture

`@codeminity/axios` intentionally avoids owning business logic:

| Package                    | Responsibility               |
| -------------------------- | ---------------------------- |
| Axios                      | HTTP transport               |
| `@codeminity/request-core` | Request lifecycle primitives |
| `@codeminity/axios`        | Axios integration layer      |

This keeps the system maintainable, composable, and predictable as the ecosystem grows.

---

## Installation

```bash
# pnpm
pnpm add @codeminity/axios

# npm
npm install @codeminity/axios

# yarn
yarn add @codeminity/axios
```

---

## Requirements

| Requirement | Version                      |
| ----------- | ---------------------------- |
| Node.js     | ^22.13.0 OR >=24.0.0         |
| TypeScript  | >= 5 (recommended, optional) |

Works in Node.js applications, browser applications, frontend frameworks, and backend services — no application-framework dependency.

---

## Quick Start

```ts
import axios from '@codeminity/axios'

const api = axios.create({ baseURL: 'https://api.example.com' })

const response = await api.get('/users')
console.log(response.data)
```

For authenticated applications, add the `codeminity` configuration:

```ts
import axios from '@codeminity/axios'

const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: {
    getToken: async () => localStorage.getItem('token'),
    refreshToken: async () => {
      /* refresh token implementation */
    }
  }
})

const response = await api.get('/profile')
console.log(response.data)
```

The instance behaves like a normal Axios instance:

```ts
await api.post('/users', { name: 'John Doe' })
await api.put('/users/1', { name: 'Updated Name' })
await api.delete('/users/1')
```

Advanced configuration is covered in [Authentication](#authentication), [Retry](#retry), [Events](#events), and [Request Configuration](#request-configuration).

---

## Core Concepts

`@codeminity/axios` is built around one principle:

> Keep Axios as the transport layer, and move request lifecycle intelligence into dedicated infrastructure layers.

It doesn't try to replace Axios or create a new HTTP abstraction — it acts as an adapter between Axios and `@codeminity/request-core`.

### Responsibility Separation

```text
Application
    │
    ▼
@codeminity/axios
    │
    ▼
Axios
    │
    ▼
HTTP Transport
```

| Layer               | Responsibility                        |
| ------------------- | ------------------------------------- |
| Application         | Business logic and API usage          |
| `@codeminity/axios` | Axios integration and lifecycle hooks |
| Axios               | HTTP requests and responses           |
| HTTP Transport      | Network communication                 |

### Lifecycle Delegation

**The adapter is responsible for:**

- attaching Axios interceptors
- connecting Axios with request lifecycle handlers
- forwarding configuration
- exposing an Axios-compatible API

**The core package is responsible for:**

- authentication lifecycle
- refresh coordination
- async control primitives
- shared request infrastructure logic

### Adapter Philosophy

This package intentionally remains a thin adapter. It does **not** contain application business rules, API-specific logic, authentication providers, or backend assumptions — it only provides the infrastructure required to build reliable request systems.

### Request Flow

```text
API Call
    │
    ▼
Axios Instance
    │
    ▼
Request Interceptor
    │
    ▼
Authentication / Lifecycle Handling
    │
    ▼
HTTP Request
    │
    ▼
Response Interceptor
    │
    ▼
Retry / Error Processing
    │
    ▼
Application Response
```

### Why This Architecture?

Keeping lifecycle logic outside the HTTP client gives you easier maintenance, reusable infrastructure, consistent behavior across adapters, less duplicated code, and clearer package boundaries. The same architecture can extend to other transports (`fetch`, `undici`, custom clients) while keeping `@codeminity/request-core` as the shared foundation.

---

## Configuration

`@codeminity/axios` extends standard Axios configuration with an additional `codeminity` layer. Axios configuration itself is unchanged:

```ts
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000
})
```

Lifecycle-related options live under `codeminity`:

```ts
const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: {
    getToken: async () => 'token',
    refreshToken: async () => {
      /* refresh implementation */
    }
  }
})
```

The `codeminity` property is only used by `@codeminity/axios` and does not affect Axios behavior.

### Global Configuration

Configuration passed to `axios.create()` applies to all requests from that instance:

```ts
const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: {
    retries: 3,
    retryDelay: 1000,
    getToken: async () => localStorage.getItem('token')
  }
})
```

### Request-Level Configuration

Individual requests can override lifecycle behavior via the `codeminity` request option — and this takes priority over instance-level configuration:

```ts
await api.get('/public-data', {
  codeminity: { skipAuth: true }
})
```

| Configuration                     | Responsibility             |
| --------------------------------- | -------------------------- |
| Axios config                      | HTTP behavior              |
| `codeminity` config (instance)    | Request lifecycle behavior |
| `codeminity` config (per-request) | Per-request overrides      |

See also: [Authentication](#authentication) · [Retry](#retry) · [Events](#events)

---

## Authentication

`@codeminity/axios` provides authentication _infrastructure_ on top of Axios while keeping authentication _ownership_ inside your application. It doesn't know how users authenticate, where tokens are stored, or how tokens are refreshed — it just provides lifecycle hooks so your app can plug in its own strategy.

### Authentication Flow

```text
API Request
    │
    ▼
Check Authentication State
    │
    ▼
Refresh Token If Required
    │
    ▼
Attach Authorization Header
    │
    ▼
Send HTTP Request
```

### Token-Based Authentication

```ts
const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: {
    getToken: async () => localStorage.getItem('access_token')
  }
})
```

The token is automatically attached as `Authorization: Bearer <token>`.

### Refresh Token Handling

```ts
const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: {
    getToken: async () => localStorage.getItem('access_token'),
    refreshToken: async () => {
      // call your auth service, then store the new token
    }
  }
})
```

Refresh lifecycle is coordinated by `@codeminity/request-core`.

### Concurrent Refresh Protection

```text
Request A ─┐
Request B ─┼──▶ Refresh Token
Request C ─┘
```

Only one refresh operation runs; the rest wait for the result and continue afterward. This prevents duplicate refresh requests, race conditions, and inconsistent authentication state.

> **Note:** refresh coordination is scoped per Axios instance created with `axios.create()`. If your application creates multiple instances against the same backend and expects them to share a single in-flight refresh, confirm this against your installed version's release notes — don't assume it without checking, since this is exactly the kind of detail that can change between versions.

### Cookie Authentication

```ts
const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: { tokenMode: 'cookie' }
})
```

Requests are configured to send credentials with cookies.

### Skipping Authentication

```ts
await api.get('/public/config', {
  codeminity: { skipAuth: true }
})
```

Useful for public APIs, health checks, authentication endpoints, and configuration endpoints.

### Authentication Responsibility

| `@codeminity/axios` provides | Your application provides |
| ---------------------------- | ------------------------- |
| Lifecycle hooks              | Token storage             |
| Header injection             | Login / logout flow       |
| Refresh coordination         | Refresh implementation    |
|                              | User session management   |

For advanced patterns (custom token providers, server-side authentication, refresh strategies, authentication events), see [docs/guides/authentication.md](./docs/guides/authentication.md).

---

## Retry

`@codeminity/axios` provides a configurable retry layer for temporary request failures, delegated through the request lifecycle without modifying Axios behavior.

### Retry Flow

```text
HTTP Request
    │
    ▼
Request Failed
    │
    ▼
Retry Decision ──▶ No Retry
    │
    ▼
Delay
    │
    ▼
Retry Request
```

### Basic Configuration

```ts
const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: {
    retries: 3,
    retryDelay: 1000
  }
})
```

Allows up to 3 retry attempts with a 1-second delay between attempts.

### Retry Status Codes

```ts
const api = axios.create({
  codeminity: {
    retries: 3,
    retryOnStatuses: [408, 429, 500, 502, 503, 504]
  }
})
```

### Custom Retry Logic

```ts
const api = axios.create({
  codeminity: {
    retries: 5,
    shouldRetry: (error, attempt) => attempt < 3
  }
})
```

### Custom Retry Delay

```ts
const api = axios.create({
  codeminity: {
    retries: 5,
    getRetryDelay: (attempt) => attempt * 1000 // linear backoff
  }
})
```

Use this to implement linear backoff, exponential backoff, or any custom delay policy.

### Request-Level Retry Configuration

```ts
await api.get('/reports', {
  codeminity: { retries: 1, retryDelay: 500 }
})
```

Request-level configuration takes priority over instance-level configuration.

### Retry Responsibility

`@codeminity/axios` provides retry _orchestration_. Your application controls retry limits, retry conditions, and delay strategies — nothing retries blindly, and every retry decision is explicit and deterministic.

For advanced strategies (exponential backoff, custom retry policies, error classification), see [docs/guides/retry.md](./docs/guides/retry.md).

---

## Events

`@codeminity/axios` provides request lifecycle events so applications can observe and react to failures consistently — for logging, monitoring, analytics, error reporting, or notifications. The package only exposes lifecycle information; it doesn't decide what your application should do about it.

### Event Flow

```text
HTTP Request
    │
    ▼
Request Error
    │
    ▼
Error Classification
    │
    ▼
Event Emission
    │
    ▼
Application Handler
```

### Event Callback

```ts
const api = axios.create({
  codeminity: {
    onEvent: async (event, error) => {
      console.log(event)
      console.error(error)
    }
  }
})
```

### Error Callback

```ts
const api = axios.create({
  codeminity: {
    onError: async (error) => console.error(error)
  }
})
```

### Available Events

**Network events**

| Event     | Description                |
| --------- | -------------------------- |
| `network` | Network connection failure |
| `timeout` | Request timeout            |
| `abort`   | Request cancellation       |

**Authentication events**

| Event                 | Description                    |
| --------------------- | ------------------------------ |
| `auth_refresh_failed` | Refresh token operation failed |
| `auth_token_failed`   | Token retrieval failed         |

**HTTP events**

| Event                  | Description |
| ---------------------- | ----------- |
| `bad_request`          | HTTP 400    |
| `unauthorized`         | HTTP 401    |
| `forbidden`            | HTTP 403    |
| `not_found`            | HTTP 404    |
| `conflict`             | HTTP 409    |
| `unprocessable_entity` | HTTP 422    |
| `too_many_requests`    | HTTP 429    |
| `internal_error`       | HTTP 500    |
| `bad_gateway`          | HTTP 502    |
| `service_unavailable`  | HTTP 503    |
| `gateway_timeout`      | HTTP 504    |

### Logging & Monitoring Examples

```ts
const api = axios.create({
  codeminity: {
    onEvent: async (event, error) => {
      logger.capture({ event, message: error.message })
      monitoring.track('api_error', { event, status: error.response?.status })
    }
  }
})
```

### Event Responsibility

| `@codeminity/axios` handles | Your application handles     |
| --------------------------- | ---------------------------- |
| Detecting lifecycle events  | Logging strategy             |
| Classifying errors          | User notifications           |
| Notifying callbacks         | Reporting systems / recovery |

For advanced patterns (custom error pipelines, monitoring integration, app-wide error strategy), see [docs/guides/events.md](./docs/guides/events.md).

---

## Request Configuration

Request-level configuration lets individual requests override or customize lifecycle behavior without changing the Axios instance configuration.

```ts
await api.get('/users', {
  codeminity: { skipAuth: true }
})
```

### Available Options

| Option       | Type      | Description                                   |
| ------------ | --------- | --------------------------------------------- |
| `skipAuth`   | `boolean` | Skip authentication handling for this request |
| `retries`    | `number`  | Maximum retry attempts for this request       |
| `retryDelay` | `number`  | Delay between retry attempts (ms)             |

### Configuration Priority

```text
Request Configuration
        │
        ▼
Axios Instance Configuration
        │
        ▼
Default Behavior
```

Request-level configuration always wins. Use it for **local exceptions only** — global behavior should be configured at the Axios instance level.

---

## TypeScript

`@codeminity/axios` is built with TypeScript and extends Axios types to support Codeminity-specific configuration while preserving the original Axios API.

```ts
import axios from '@codeminity/axios'

const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: {
    retries: 3,
    retryDelay: 1000,
    getToken: async () => 'token'
  }
})
```

TypeScript provides autocomplete and validation for Axios configuration, Codeminity configuration, request-level options, and lifecycle callbacks.

### Axios Module Augmentation

The `codeminity` property is available on requests without extra type declarations:

```ts
await api.get('/users', {
  codeminity: { skipAuth: true, retries: 2 }
})
```

### Custom Error Handling

```ts
const api = axios.create({
  codeminity: {
    onEvent: (event, error) => {
      console.log(event, error.response?.status)
    }
  }
})
```

The event type is restricted to supported lifecycle events.

### Recommended `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

Works with Node.js projects, browser applications, React / Vue / Angular, backend services, and framework-agnostic TypeScript projects — no framework-specific types required.

---

## API Reference

`@codeminity/axios` keeps its public API minimal: Axios-compatible instance creation, Axios instance methods, and Codeminity configuration options.

### `axios.create()`

```ts
const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: {
    getToken: async () => 'token'
  }
})
```

```ts
interface CreateAxiosDefaults {
  // ...standard Axios options
  codeminity?: Config
}
```

### Codeminity Configuration

| Option            | Type                            | Description                         |
| ----------------- | ------------------------------- | ----------------------------------- |
| `getToken`        | `() => Promise<string \| null>` | Provides the current access token   |
| `refreshToken`    | `() => Promise<void>`           | Handles the token refresh flow      |
| `tokenMode`       | `TokenModeEnum`                 | Defines the authentication strategy |
| `retries`         | `number`                        | Maximum retry attempts              |
| `retryDelay`      | `number`                        | Delay between retries               |
| `retryOnStatuses` | `number[]`                      | HTTP statuses eligible for retry    |
| `shouldRetry`     | `(error, attempt) => boolean`   | Custom retry decision               |
| `getRetryDelay`   | `(attempt) => number`           | Custom retry delay strategy         |
| `onEvent`         | `(event, error) => void`        | Lifecycle event callback            |
| `onError`         | `(error) => void`               | General error callback              |

### Request Configuration Options

| Option       | Type      | Description                  |
| ------------ | --------- | ---------------------------- |
| `skipAuth`   | `boolean` | Skip authentication handling |
| `retries`    | `number`  | Override retry attempts      |
| `retryDelay` | `number`  | Override retry delay         |

### Axios Instance Methods

All standard Axios methods remain available: `api.get(url)`, `api.post(url, data)`, `api.put(url, data)`, `api.patch(url, data)`, `api.delete(url)`. The returned instance behaves like a normal Axios instance.

### Exports

```ts
import axios from '@codeminity/axios'
import type { AxiosInstance, AxiosResponse } from '@codeminity/axios'
```

### Public API Stability

Only the documented API surface is stable. Internal modules (`src/handlers/`, `src/interceptors/`, `src/factories/`, `src/utils/`) are **not** part of the public contract — applications should only depend on exported package APIs.

---

## Examples

### Basic API Client

```ts
export const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000
})

const response = await api.get('/users')
```

### Authenticated API Client

```ts
const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: {
    getToken: async () => localStorage.getItem('access_token')
  }
})
```

Every request automatically receives `Authorization: Bearer <token>`.

### Authentication With Refresh Token

```ts
const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: {
    getToken: async () => authStore.accessToken,
    refreshToken: async () => {
      const token = await authService.refresh()
      authStore.setToken(token)
    }
  }
})
```

Concurrent requests share the same refresh lifecycle.

### Public Endpoints

```ts
await api.get('/configuration', {
  codeminity: { skipAuth: true }
})
```

### Retry Failed Requests

```ts
const api = axios.create({
  codeminity: {
    retries: 3,
    retryDelay: 1000,
    retryOnStatuses: [408, 429, 500, 502, 503, 504]
  }
})
```

### Custom Retry Strategy

```ts
const api = axios.create({
  codeminity: {
    retries: 5,
    shouldRetry: (error, attempt) => attempt <= 3 && error.response?.status === 503,
    getRetryDelay: (attempt) => attempt * 1000
  }
})
```

### Error Monitoring

```ts
const api = axios.create({
  codeminity: {
    onEvent: async (event, error) => {
      monitoring.capture({ event, status: error.response?.status })
    }
  }
})
```

### Multiple API Clients

```ts
const userApi = axios.create({
  baseURL: 'https://users.example.com',
  codeminity: { getToken }
})

const paymentApi = axios.create({
  baseURL: 'https://payments.example.com',
  codeminity: { getToken, retries: 5 }
})
```

### Framework Integration

```ts
export async function getUsers() {
  const response = await api.get('/users')
  return response.data
}
```

The API layer stays independent from React, Vue, Angular, or any Node.js framework.

### Recommended Project Structure

```text
src/
├── api/
│   ├── client.ts
│   ├── users.ts
│   └── payments.ts
├── services/
│   └── user-service.ts
└── features/
```

Keep Axios configuration in one place and expose domain-specific API clients on top of it.

For more advanced patterns (authentication strategies, retry policies, monitoring integration, production architecture), see [docs/guides/](./docs/guides/).

---

## Migration from Axios

`@codeminity/axios` is a drop-in enhancement layer on top of Axios. Migration doesn't require rewriting your HTTP layer.

### Why Migrate?

Standard Axios gives you HTTP requests, interceptors, request configuration, and response handling. `@codeminity/axios` keeps all of that and adds authentication lifecycle management, refresh token coordination, retry orchestration, typed request configuration, and centralized request events.

### Update the Import

```diff
- import axios from 'axios'
+ import axios from '@codeminity/axios'
```

Your existing code continues to work as-is, including existing `axios.create()` calls — no API changes required.

### Adding Authentication

```diff
- api.interceptors.request.use((config) => {
-   config.headers.Authorization = `Bearer ${token}`
-   return config
- })
+ const api = axios.create({
+   baseURL: 'https://api.example.com',
+   codeminity: {
+     getToken: async () => token,
+   },
+ })
```

### Adding Refresh Token Support

```diff
- api.interceptors.response.use(
-   (response) => response,
-   async (error) => { /* custom refresh logic */ }
- )
+ const api = axios.create({
+   codeminity: {
+     getToken: async () => accessToken,
+     refreshToken: async () => { await refreshSession() },
+   },
+ })
```

Refresh coordination is handled by `@codeminity/request-core`.

### Adding Retry Support

```diff
- api.interceptors.response.use(
-   (response) => response,
-   async (error) => { /* custom retry logic */ }
- )
+ const api = axios.create({
+   codeminity: { retries: 3, retryDelay: 1000 },
+ })
```

### Request-Level Migration

Existing calls like `api.get('/users')` keep working. Add lifecycle options only where needed:

```ts
api.get('/users', {
  codeminity: { skipAuth: true }
})
```

### Keeping Existing Interceptors

Custom Axios interceptors are still fully supported — use them for application-specific behavior, and use `@codeminity/axios` for request lifecycle concerns.

### Recommended Migration Path

```text
1. Install @codeminity/axios
2. Replace the Axios import
3. Move authentication logic into `codeminity` config
4. Move retry logic into `codeminity` config
5. Remove duplicated interceptors
```

### What Should Stay in Your Application?

**Keep:** API services, business rules, domain models, application state, user flows.
**Move to the request layer:** token attachment, refresh coordination, retry handling, request lifecycle events.

---

## Best Practices

### Create a Single API Client

✅ **Recommended**

```ts
export const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: { getToken }
})
```

❌ **Avoid**

```ts
axios.get('/users', { headers: { Authorization: token } })
```

Centralized configuration prevents duplicated behavior scattered across the app.

### Keep Authentication Logic Outside Components

✅ Configure `getToken` / `refreshToken` once on the client.
❌ Avoid setting `api.defaults.headers.Authorization` from inside a component lifecycle hook.

### Don't Duplicate Core Logic

The package already provides token lifecycle handling, refresh coordination, retry orchestration, and error events — avoid reimplementing the same logic with custom interceptors.

### Use Request-Level Configuration Only for Exceptions

```ts
const api = axios.create({ codeminity: { retries: 3 } })

await api.get('/critical-data', { codeminity: { retries: 5 } })
```

Global behavior belongs in the client config; per-request overrides should be the exception, not the rule.

### Configure Retry Carefully

Good candidates for retry: `GET` requests, idempotent operations, temporary infrastructure failures.
Be careful with: payments, orders, and other irreversible mutations.

```ts
codeminity: {
  retryOnStatuses: [429, 500, 502, 503, 504]
}
```

### Centralize Error Handling

```ts
const api = axios.create({
  codeminity: {
    onEvent: async (event, error) => logger.error(event, error)
  }
})
```

Avoid handling the same infrastructure errors independently in every service.

### Keep API Services Separate From Business Logic

```text
src/
├── api/
│   └── client.ts
├── services/
│   └── user-service.ts
└── features/
```

### Prefer Multiple Clients for Different Backends

```ts
const userApi = axios.create({ baseURL: 'https://users.example.com' })
const paymentApi = axios.create({ baseURL: 'https://payments.example.com' })
```

Each client can carry its own lifecycle configuration.

### Avoid Global Mutable State

❌ `axios.defaults.headers.Authorization = token`
✅ `codeminity: { getToken }`

Explicit dependencies are easier to test and reason about.

### Depend Only on the Public API

✅ `import axios from '@codeminity/axios'`
❌ `import { something } from '@codeminity/axios/src/internal'`

Internal structure may change without notice.

---

## FAQ

**Is `@codeminity/axios` a replacement for Axios?**
No — it's an adapter built on top of Axios that adds authentication handling, refresh coordination, retry management, and lifecycle events.

**Do I need to learn a new HTTP client?**
No. If you know Axios, you know most of the API already. The main addition is the `codeminity` configuration object.

**Does `@codeminity/axios` send HTTP requests itself?**
No — HTTP transport is still handled entirely by Axios.

**Why isn't authentication implemented directly in this package?**
Authentication rules differ between applications. This package only provides lifecycle orchestration; your app defines token storage, retrieval, refresh implementation, and session behavior.

**Where does refresh token logic live?**
Coordination is handled by `@codeminity/request-core`; `@codeminity/axios` connects Axios requests to that engine.

**Can I use it without authentication?**
Yes — `axios.create({ baseURL: '...' })` works as a normal Axios client.

**Can I keep my existing Axios interceptors?**
Yes, fully supported. Use interceptors for app-specific behavior and `@codeminity/axios` for lifecycle concerns.

**Does it work with React, Vue, or Angular?**
Yes — the package is completely framework-agnostic.

**Does it support plain JavaScript projects?**
Yes. TypeScript is included for a better developer experience but isn't required.

**Are retries enabled by default?**
No — retry behavior is fully explicit. You choose the count, conditions, and delays.

**Can I disable authentication for a single request?**
Yes: `api.get('/public-data', { codeminity: { skipAuth: true } })`.

**Can each Axios instance have different configuration?**
Yes — every instance created via `axios.create()` can have its own `codeminity` config.

**Does it maintain global state?**
No. Configuration and lifecycle state — including refresh coordination — are scoped to each instance created via `axios.create()`. Two instances never share a refresh queue or any other mutable state, even if created with identical config. This is an explicit architectural decision (see ADR-004 in `DECISIONS.md`) and is covered by regression tests.

**Can I import internal files?**
No — only `import axios from '@codeminity/axios'` is supported. Internal files are implementation details and may change without notice.

**How do I migrate from plain Axios?**
See [Migration from Axios](#migration-from-axios) — it's designed to be incremental.

**Where should I report issues?**
Use the project issue tracker — see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Performance

`@codeminity/axios` is designed to add request lifecycle features with minimal runtime overhead, delegating HTTP transport entirely to Axios.

```text
Application
    │
    ▼
@codeminity/axios
    │
    ▼
Axios
    │
    ▼
HTTP Transport
```

Only a thin adapter layer sits between your application and Axios.

### Runtime Overhead

For successful requests, the adapter performs only request interceptor execution and, if configured, authentication handling and token injection. No additional work happens unless you configure it.

### Retry Performance

Retry logic is evaluated only after a failed request:

```text
Request Failed → Retry Decision ──▶ No Retry
       │
       ▼
  Optional Delay
       │
       ▼
  Retry Request
```

If retries are disabled, there's zero retry-related overhead.

### Authentication Performance

**JWT mode:** `Request → Get Token → Attach Authorization Header → Send Request`
**Cookie mode:** the adapter simply enables credential support before sending — no token retrieval or header manipulation.

### Refresh Coordination

```text
Request A ─┐
Request B ─┼── Wait ──▶ Single Refresh Operation ──▶ Resume Waiting Requests
Request C ─┘
```

Only one refresh operation executes, avoiding duplicate network requests, race conditions, and unnecessary authentication traffic.

### Memory & Scope

Per-instance resources are intentionally small. Each `axios.create()` call gets its own isolated refresh queue and lifecycle state — nothing is shared or deduplicated across instances, by design (ADR-004) and verified by tests.

### Multiple API Clients

```ts
const usersApi = axios.create({ baseURL: 'https://users.example.com' })
const paymentsApi = axios.create({ baseURL: 'https://payments.example.com' })
```

Each instance keeps its own Axios configuration while using the same lightweight adapter design.

### TypeScript & Bundle Size

TypeScript types are compile-time only and don't affect runtime bundle size. The package stays small by building on top of Axios, delegating lifecycle logic to `@codeminity/request-core`, and avoiding unnecessary or framework-specific abstractions.

### Performance Philosophy

The goal isn't to make HTTP requests faster — it's to make request lifecycles deterministic, predictable, concurrency-safe, and maintainable, while keeping runtime overhead as low as possible.

---

## Architecture

`@codeminity/axios` follows a layered architecture where each layer has a single responsibility. The package itself doesn't implement HTTP transport or request lifecycle logic — it bridges Axios with `@codeminity/request-core`.

```text
Application
    │
    ▼
@codeminity/axios
    │
    ▼
Axios
    │
    ▼
HTTP Transport
```

| Layer                      | Responsibility                                           |
| -------------------------- | -------------------------------------------------------- |
| Application                | Business logic and API usage                             |
| `@codeminity/axios`        | Request lifecycle integration                            |
| Axios                      | HTTP client                                              |
| `@codeminity/request-core` | Authentication, refresh coordination, retry, concurrency |

For a complete explanation of design principles, dependency rules, and internal architecture, see [**ARCHITECTURE.md**](./ARCHITECTURE.md).

---

## Guides

- Authentication — [docs/guides/authentication.md](./docs/guides/authentication.md)
- Retry — [docs/guides/retry.md](./docs/guides/retry.md)
- Events — [docs/guides/events.md](./docs/guides/events.md)
- Advanced Patterns — [docs/guides/advanced-patterns.md](./docs/guides/advanced-patterns.md)

More guides will be added as the project evolves.

---

## Related Packages

`@codeminity/axios` is part of the **Codeminity** ecosystem.

| Package                    | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `@codeminity/request-core` | Framework-agnostic request lifecycle engine used by this package. |

Additional packages will be released as the ecosystem grows.

---

## Contributing

Contributions are welcome. Before opening a pull request, please read [CONTRIBUTING.md](./CONTRIBUTING.md). For architectural decisions and design rationale, see [DECISIONS.md](./DECISIONS.md).

---

## License

Licensed under the MIT License.
