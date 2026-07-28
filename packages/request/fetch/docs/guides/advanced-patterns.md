# Guide: Advanced Patterns

This guide collects patterns that go beyond single-topic guides — combining authentication, retry, and events together, and structuring larger applications around `@codeminity/fetch`.

---

## Table of Contents

- [Building a Base-URL Client](#building-a-base-url-client)
- [Layered API Clients](#layered-api-clients)
- [Request Cancellation](#request-cancellation)
- [Combining Auth + Retry + Events](#combining-auth--retry--events)
- [Feature-Flagged Lifecycle Behavior](#feature-flagged-lifecycle-behavior)
- [Multi-Backend Applications](#multi-backend-applications)
- [Server-Side Rendering Considerations](#server-side-rendering-considerations)
- [Testing Strategy for Larger Applications](#testing-strategy-for-larger-applications)
- [Upgrading Safely](#upgrading-safely)

---

## Building a Base-URL Client

Unlike `@codeminity/axios`, there's no `baseURL` option — `createFetch`'s returned function takes the exact same `input` native `fetch` does. Compose a base URL yourself with a thin wrapper:

```ts
import { createFetch, type Config, type FetchRequestInit } from '@codeminity/fetch'

function createClient(baseURL: string, config: Config = {}) {
  const apiFetch = createFetch(config)

  return (path: string, init?: FetchRequestInit) => apiFetch(new URL(path, baseURL), init)
}

const api = createClient('https://api.example.com', {
  getToken: () => localStorage.getItem('token')
})

await api('/users')
```

## Layered API Clients

For larger applications, avoid one giant client with every option jammed in. Instead, build a small base-client factory and layer domain-specific services on top:

```text
src/
├── api/
│   ├── create-client.ts     # shared lifecycle config (auth, retry, events) + base-URL wrapper
│   ├── users-client.ts       # client-specific overrides
│   └── payments-client.ts
├── services/
│   ├── user-service.ts       # business-level functions using users-client
│   └── payment-service.ts
```

```ts
import { createFetch, type Config, type ErrorEvent } from '@codeminity/fetch'

declare function sharedGetToken(): Promise<string | null>
declare function sharedRefreshToken(): Promise<void>
declare function sharedOnEvent(event: ErrorEvent): void | Promise<void>

// create-client.ts
export function createClient(baseURL: string, overrides: Config = {}) {
  const apiFetch = createFetch({
    getToken: sharedGetToken,
    refreshToken: sharedRefreshToken,
    onEvent: sharedOnEvent,
    retries: 2,
    ...overrides
  })

  return (path: string, init?: Parameters<typeof apiFetch>[1]) =>
    apiFetch(new URL(path, baseURL), init)
}

// payments-client.ts
export const paymentsApi = createClient('https://payments.example.com', {
  retries: 0 // no automatic retry for payment mutations
})
```

This keeps shared lifecycle behavior (auth, logging) consistent while still allowing per-domain overrides.

## Request Cancellation

`@codeminity/fetch` doesn't change native cancellation — `AbortController` still works exactly as it does with plain `fetch`:

```ts
import { createFetch } from '@codeminity/fetch'

declare const apiFetch: ReturnType<typeof createFetch>

const controller = new AbortController()

apiFetch('/search', { signal: controller.signal }).catch((error: unknown) => {
  if (error instanceof DOMException && error.name === 'AbortError') return // expected
  throw error
})

controller.abort()
```

The `abort` lifecycle event fires for cancellations, which is useful for distinguishing "the user navigated away" from a genuine failure in your `onEvent` handler — treat `abort` as a no-op in most monitoring pipelines rather than an error.

## Combining Auth + Retry + Events

A realistic production configuration typically combines all three lifecycle pieces:

```ts
import { createFetch, type ErrorEvent, type FetchOutcome } from '@codeminity/fetch'

declare const authStore: {
  accessToken: string | null
  refresh: () => Promise<void>
  clear: () => void
}

declare const router: { push: (path: string) => void }
declare const monitoring: { track: (name: string, data: Record<string, unknown>) => void }

function handleEvent(event: ErrorEvent, outcome: FetchOutcome): void {
  if (event === 'auth_refresh_failed') {
    authStore.clear()
    router.push('/login')
    return
  }
  monitoring.track('api_error', { event, status: outcome.response?.status })
}

const apiFetch = createFetch({
  // auth
  getToken: async () => authStore.accessToken,
  refreshToken: async () => authStore.refresh(),

  // retry
  retries: 3,
  retryOnStatuses: [408, 429, 500, 502, 503, 504],
  getRetryDelay: (attempt) => Math.min(2 ** attempt * 200, 5000),

  // events
  onEvent: handleEvent
})

await apiFetch('https://api.example.com/data', {
  signal: AbortSignal.timeout(8000) // request-level timeout, see README
})
```

Reading order matters here for anyone maintaining this later: auth resolves first (does this request even get to send with a valid token), retry governs what happens on transient failure, and events are the observability layer wrapping both.

## Feature-Flagged Lifecycle Behavior

For gradual rollouts (e.g., testing a new retry policy on a subset of traffic), keep the flag check outside the `codeminity` config object rather than inside callback bodies, so the resulting config is easy to log/debug:

```ts
import { createFetch, type RetryConfig } from '@codeminity/fetch'

declare const featureFlags: { isEnabled: (flag: string) => boolean }
declare function getToken(): Promise<string | null>

const retryConfig: RetryConfig = featureFlags.isEnabled('aggressive-retry')
  ? { retries: 5, getRetryDelay: (a: number) => a * 500 }
  : { retries: 2, retryDelay: 1000 }

const apiFetch = createFetch({
  getToken,
  ...retryConfig
})
```

## Multi-Backend Applications

When talking to several backends with different auth schemes (e.g., one OAuth-based, one API-key-based):

```ts
import { createFetch } from '@codeminity/fetch'

declare const getOAuthToken: () => string | null
declare const refreshOAuthToken: () => Promise<void>

const oauthApi = createFetch({ getToken: getOAuthToken, refreshToken: refreshOAuthToken })

const apiKeyService = createFetch({
  getToken: async () => process.env.LEGACY_API_KEY ?? null
})
```

Because refresh coordination is scoped per instance (see [ARCHITECTURE.md](../../ARCHITECTURE.md#instance-isolation)), these two clients won't interfere with each other even though both use the `getToken` mechanism differently.

## Server-Side Rendering Considerations

In SSR contexts, avoid creating a module-level singleton client that captures a per-request token in a closure — this can leak one user's token into another user's request if the client is reused across requests on the server:

```ts
import { createFetch } from '@codeminity/fetch'

// ❌ Avoid: shared module-level client capturing per-request state
declare let currentUserToken: string
export const apiFetch = createFetch({ getToken: async () => currentUserToken })

// ✅ Prefer: a client created fresh per request/handler
export function createRequestScopedFetch(userToken: string) {
  return createFetch({ getToken: async () => userToken })
}
```

On the client/browser side, a single long-lived instance is fine since there's only one user per browser session.

## Testing Strategy for Larger Applications

- **Unit test** business logic (`services/`) against a mocked API client — don't spin up real HTTP in unit tests.
- **Integration test** the client factory (`create-client.ts`) against a stubbed `globalThis.fetch` to verify auth headers, retry counts, and event emission end-to-end.
- **Contract test** critical endpoints (payments, auth) separately, since these are the ones where retry/idempotency mistakes are most costly.
- Keep a small suite of concurrency tests specifically for refresh coordination — this is the area most prone to regressions.
- Periodically verify behavior against a **real** server too, not just a stubbed `fetch` — see this package's own `index.integration.test.ts` and its accompanying real-HTTP-server smoke test for the pattern.

## Upgrading Safely

- Read the changelog for changes to default behavior, not just new features — defaults for retry and instance scoping are the kind of thing that can change silently between versions.
- Pin `@codeminity/fetch` and `@codeminity/request-core` to compatible versions rather than letting them drift independently, since lifecycle behavior is split across both packages (see [ARCHITECTURE.md](../../ARCHITECTURE.md#dependency-rules)).
- After upgrading, re-run your concurrency and idempotency tests specifically — these are the behaviors most likely to shift even in otherwise-compatible releases.
