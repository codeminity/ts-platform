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
const api = axios.create({
  baseURL: 'https://api.example.com',
  codeminity: {
    getToken: async () => localStorage.getItem('access_token')
  }
})
```

`getToken` is called before each request that isn't marked `skipAuth`. If it resolves to `null` or `undefined`, no `Authorization` header is attached.

## Custom Token Providers

`getToken` can pull from anywhere — memory, a store, secure storage, or an in-memory cache with its own TTL:

```ts
let cachedToken: string | null = null
let expiresAt = 0

const api = axios.create({
  codeminity: {
    getToken: async () => {
      if (cachedToken && Date.now() < expiresAt) {
        return cachedToken
      }
      const { token, expiresIn } = await tokenStore.read()
      cachedToken = token
      expiresAt = Date.now() + expiresIn * 1000
      return cachedToken
    }
  }
})
```

Keep `getToken` fast and side-effect-light — it runs on every authenticated request. Expensive or network-bound token retrieval should be cached, with `refreshToken` reserved for the actual refresh network call.

## Refresh Strategies

### Reactive Refresh (on 401)

The most common pattern: attempt the request, and if it fails with `401`, refresh once and retry.

```ts
const api = axios.create({
  codeminity: {
    getToken: async () => authStore.accessToken,
    refreshToken: async () => {
      const { accessToken, refreshToken } = await authService.refresh(authStore.refreshToken)
      authStore.setTokens(accessToken, refreshToken)
    }
  }
})
```

This is handled automatically — you don't need to detect the 401 yourself.

### Proactive Refresh (before expiry)

If your tokens carry an expiry, you can refresh slightly ahead of time inside `getToken` itself, rather than waiting for a 401:

```ts
const api = axios.create({
  codeminity: {
    getToken: async () => {
      if (isExpiringSoon(authStore.accessToken)) {
        await authStore.refresh()
      }
      return authStore.accessToken
    }
  }
})
```

Both strategies can coexist: proactive refresh reduces how often the reactive path is hit, while the reactive path remains a safety net for clock drift or unexpectedly short-lived tokens.

## Server-Side Authentication

In server-to-server contexts (no `localStorage`, no browser), token storage typically lives in memory or in a secrets manager:

```ts
import { getServiceToken, refreshServiceToken } from './secrets-client'

const api = axios.create({
  baseURL: 'https://internal-api.example.com',
  codeminity: {
    getToken: getServiceToken,
    refreshToken: refreshServiceToken
  }
})
```

For per-request-scoped identities (e.g., a backend forwarding a user's own token per incoming request), avoid a single shared client-level `getToken`. Instead, either:

- create a lightweight client per request/user context, or
- pass the token explicitly via request-level configuration if your use case is a single call rather than a long-lived client (see [Request Configuration](../../README.md#request-configuration)).

## Authentication Events

Combine `onEvent` with the authentication event types to react to failures distinctly from other errors:

```ts
const api = axios.create({
  codeminity: {
    getToken: async () => authStore.accessToken,
    refreshToken: async () => authStore.refresh(),
    onEvent: async (event, error) => {
      if (event === 'auth_refresh_failed') {
        authStore.clear()
        redirectToLogin()
      }
      if (event === 'auth_token_failed') {
        logger.warn('Token retrieval failed', error)
      }
    }
  }
})
```

`auth_refresh_failed` is the signal to treat as "the session is over" — it fires when `refreshToken` itself throws or fails, meaning retrying further isn't going to help.

## Multi-Tenant / Multi-Account Auth

For applications juggling multiple accounts or tenants, prefer one client per tenant over trying to make a single client's `getToken` branch on ambient state:

```ts
function createTenantApi(tenantId: string) {
  return axios.create({
    baseURL: `https://api.example.com/t/${tenantId}`,
    codeminity: {
      getToken: async () => tokenStoreFor(tenantId).read(),
      refreshToken: async () => tokenStoreFor(tenantId).refresh()
    }
  })
}
```

This keeps refresh coordination and token state cleanly separated per tenant, rather than relying on closures capturing "current tenant" mutable state, which is a common source of subtle cross-tenant bugs.

## Testing Authenticated Clients

- Mock `getToken` and `refreshToken` directly rather than mocking `localStorage` or the network — they're the actual seams the package calls into.
- Test the "concurrent 401" scenario explicitly: fire several requests at once against a mock server that returns 401 once and then 200, and assert `refreshToken` was called exactly once.
- Test `auth_refresh_failed` handling by making the mock `refreshToken` reject, and asserting your app's session-teardown logic runs.

## Common Pitfalls

- **Attaching tokens manually in addition to `getToken`.** If you still have an old interceptor setting `Authorization` alongside a configured `getToken`, remove the old one — see [Migration from Axios](../../README.md#migration-from-axios).
- **Doing network calls inside `getToken` on every request.** Cache the token and only hit the network from `refreshToken`.
- **Assuming refresh coordination is shared across every `axios.create()` instance in your app.** It's scoped per instance — see [ARCHITECTURE.md](../../ARCHITECTURE.md#instance-isolation) and [DECISIONS.md](../../DECISIONS.md#adr-004-refresh-coordination-scope--per-instance-vs-shared). If you need one shared refresh cycle, use one shared client instance rather than relying on cross-instance behavior.
