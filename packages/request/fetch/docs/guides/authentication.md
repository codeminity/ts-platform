# Guide: Authentication

This guide covers authentication patterns beyond the basics shown in the [README](../../README.md#authentication) — custom token providers, server-side authentication, refresh strategies, and authentication events.

---

## Table of Contents

- [Recap: Basic Token Auth](#recap-basic-token-auth)
- [Custom Token Providers](#custom-token-providers)
- [Refresh Strategies](#refresh-strategies)
- [Server-Side Authentication](#server-side-authentication)
- [Authentication Events](#authentication-events)
- [Multi-Tenant / Multi-Account Auth](#multi-tenant--multi-account-auth)
- [Testing Authenticated Clients](#testing-authenticated-clients)
- [Common Pitfalls](#common-pitfalls)

---

## Recap: Basic Token Auth

```ts
import { createFetch } from '@codeminity/fetch'

const apiFetch = createFetch({
  getToken: async () => localStorage.getItem('access_token')
})
```

`getToken` is called before each request that isn't marked `skipAuth`. If it resolves to `null` or `undefined`, no `Authorization` header is attached.

## Custom Token Providers

`getToken` can pull from anywhere — memory, a store, secure storage, or an in-memory cache with its own TTL:

```ts
import { createFetch } from '@codeminity/fetch'

declare const tokenStore: { read: () => Promise<{ token: string; expiresIn: number }> }

let cachedToken: string | null = null
let expiresAt = 0

const apiFetch = createFetch({
  getToken: async () => {
    if (cachedToken && Date.now() < expiresAt) {
      return cachedToken
    }
    const { token, expiresIn } = await tokenStore.read()
    cachedToken = token
    expiresAt = Date.now() + expiresIn * 1000
    return cachedToken
  }
})
```

Keep `getToken` fast and side-effect-light — it runs on every authenticated request. Expensive or network-bound token retrieval should be cached, with `refreshToken` reserved for the actual refresh network call.

## Refresh Strategies

### Reactive Refresh (on 401)

The most common pattern: attempt the request, and if it fails with `401`, refresh once and retry. `@codeminity/fetch` never throws on a `401` (see [README](../../README.md#faq)), so "refresh, then retry" has to be driven through `shouldRetry` rather than a `catch` block — `isTokenExpired` is what actually gates whether `refreshToken` runs, so the retry decision is where you flip it:

```ts
import { createFetch } from '@codeminity/fetch'

declare const authStore: {
  accessToken: string | null
  refreshToken: string | null
  setTokens: (accessToken: string, refreshToken: string) => void
}

declare const authService: {
  refresh: (refreshToken: string | null) => Promise<{ accessToken: string; refreshToken: string }>
}

let expired = false

const apiFetch = createFetch({
  getToken: async () => authStore.accessToken,
  isTokenExpired: () => expired,
  refreshToken: async () => {
    const { accessToken, refreshToken } = await authService.refresh(authStore.refreshToken)
    authStore.setTokens(accessToken, refreshToken)
    expired = false
  },
  retries: 1,
  shouldRetry: (outcome, attempt) => {
    if (outcome.response?.status === 401 && attempt <= 1) {
      expired = true
      return true
    }
    return false
  }
})
```

`shouldRetry` runs _before_ the retried attempt re-applies auth, so setting `expired = true` there is what makes the next attempt see `isTokenExpired() === true` and actually call `refreshToken`. `onEvent`/`onError` won't help here — they only fire on the final outcome of the whole retry sequence, not between individual attempts.

### Proactive Refresh (before expiry)

If your tokens carry an expiry, refresh slightly ahead of time inside `isTokenExpired`/`getToken`, rather than waiting for a `401`:

```ts
import { createFetch } from '@codeminity/fetch'

declare function isExpiringSoon(token: string | null): boolean

declare const authStore: {
  accessToken: string | null
  refresh: () => Promise<void>
}

const apiFetch = createFetch({
  isTokenExpired: () => isExpiringSoon(authStore.accessToken),
  refreshToken: async () => authStore.refresh(),
  getToken: () => authStore.accessToken
})
```

This is the more reliable strategy for `@codeminity/fetch` specifically, since it doesn't depend on also configuring `retryOnStatuses: [401]` — refresh runs before the request is even sent, based on `isTokenExpired`, independent of retry.

## Server-Side Authentication

In server-to-server contexts (no `localStorage`, no browser), token storage typically lives in memory or in a secrets manager:

```ts
import { createFetch } from '@codeminity/fetch'

declare function getServiceToken(): Promise<string | null>
declare function refreshServiceToken(): Promise<void>

const apiFetch = createFetch({
  getToken: getServiceToken,
  refreshToken: refreshServiceToken
})

await apiFetch('https://internal-api.example.com/status')
```

For per-request-scoped identities (e.g., a backend forwarding a user's own token per incoming request), avoid a single shared `getToken`. Instead, either:

- create a lightweight `createFetch()` instance per request/user context, or
- pass the token explicitly via a per-call `Authorization` header and `skipAuth: true`, if your use case is a single call rather than a long-lived client.

## Authentication Events

Combine `onEvent` with the authentication event types to react to failures distinctly from other errors:

```ts
import { createFetch, type ErrorEvent, type FetchOutcome } from '@codeminity/fetch'

declare const authStore: {
  accessToken: string | null
  refresh: () => Promise<void>
  clear: () => void
}

declare function redirectToLogin(): void

declare const logger: { warn: (message: string, error: unknown) => void }

function handleAuthEvent(event: ErrorEvent, outcome: FetchOutcome): void {
  if (event === 'auth_refresh_failed') {
    authStore.clear()
    redirectToLogin()
  }
  if (event === 'auth_token_failed') {
    logger.warn('Token retrieval failed', outcome.error)
  }
}

const apiFetch = createFetch({
  getToken: async () => authStore.accessToken,
  refreshToken: async () => authStore.refresh(),
  onEvent: handleAuthEvent
})
```

`auth_refresh_failed` is the signal to treat as "the session is over" — it fires when `refreshToken` itself throws, meaning retrying further isn't going to help.

## Multi-Tenant / Multi-Account Auth

For applications juggling multiple accounts or tenants, prefer one `createFetch()` instance per tenant over trying to make a single instance's `getToken` branch on ambient state:

```ts
import { createFetch } from '@codeminity/fetch'

declare function tokenStoreFor(tenantId: string): {
  read: () => Promise<string | null>
  refresh: () => Promise<void>
}

function createTenantFetch(tenantId: string) {
  return createFetch({
    getToken: async () => tokenStoreFor(tenantId).read(),
    refreshToken: async () => tokenStoreFor(tenantId).refresh()
  })
}
```

This keeps refresh coordination and token state cleanly separated per tenant, rather than relying on closures capturing "current tenant" mutable state, which is a common source of subtle cross-tenant bugs.

## Testing Authenticated Clients

- Mock `getToken` and `refreshToken` directly rather than mocking `localStorage` or the network — they're the actual seams the package calls into.
- Test the "concurrent 401" scenario explicitly: fire several requests at once against a stubbed `fetch` that returns `401` once and then `200`, and assert `refreshToken` was called exactly once.
- Test `auth_refresh_failed` handling by making the mock `refreshToken` reject, and asserting your app's session-teardown logic runs.

## Common Pitfalls

- **Assuming a `401` throws.** It doesn't — `@codeminity/fetch` resolves with the `Response` even on `401`. Combine `isTokenExpired`/proactive refresh with (optionally) `retryOnStatuses: [401]` rather than expecting a `catch` block to run.
- **Doing network calls inside `getToken` on every request.** Cache the token and only hit the network from `refreshToken`.
- **Assuming refresh coordination is shared across every `createFetch()` instance in your app.** It's scoped per instance — see [ARCHITECTURE.md](../../ARCHITECTURE.md#instance-isolation). If you need one shared refresh cycle, use one shared instance rather than relying on cross-instance behavior.
- **Not setting `refreshTimeout` on a `refreshToken` that calls a network endpoint.** Without it, a `refreshToken` that never settles (a hung request, a dropped connection) hangs every request waiting on that refresh forever, with no error and no event. `refreshTimeout` (in milliseconds) fails the refresh instead, which routes through the normal `auth_refresh_failed` event.
