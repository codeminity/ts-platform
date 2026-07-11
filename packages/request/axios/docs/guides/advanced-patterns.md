# Guide: Advanced Patterns

This guide collects patterns that go beyond single-topic guides — combining authentication, retry, and events together, and structuring larger applications around `@codeminity/axios`.

---

## Table of Contents

- [Layered API Clients](#layered-api-clients)
- [Request Cancellation](#request-cancellation)
- [Combining Auth + Retry + Events](#combining-auth--retry--events)
- [Feature-Flagged Lifecycle Behavior](#feature-flagged-lifecycle-behavior)
- [Multi-Backend Applications](#multi-backend-applications)
- [Server-Side Rendering Considerations](#server-side-rendering-considerations)
- [Testing Strategy for Larger Applications](#testing-strategy-for-larger-applications)
- [Upgrading Safely](#upgrading-safely)

---

## Layered API Clients

For larger applications, avoid one giant client with every option jammed in. Instead, build a small base-client factory and layer domain-specific services on top:

```text
src/
├── api/
│   ├── create-client.ts     # shared lifecycle config (auth, retry, events)
│   ├── users-client.ts       # baseURL + client-specific overrides
│   └── payments-client.ts
├── services/
│   ├── user-service.ts       # business-level functions using users-client
│   └── payment-service.ts
```

```ts
// create-client.ts
export function createClient(baseURL: string, overrides = {}) {
  return axios.create({
    baseURL,
    codeminity: {
      getToken: sharedGetToken,
      refreshToken: sharedRefreshToken,
      onEvent: sharedOnEvent,
      retries: 2,
      ...overrides
    }
  })
}

// payments-client.ts
export const paymentsApi = createClient('https://payments.example.com', {
  retries: 0 // no automatic retry for payment mutations
})
```

This keeps shared lifecycle behavior (auth, logging) consistent while still allowing per-domain overrides.

## Request Cancellation

`@codeminity/axios` doesn't change Axios's native cancellation mechanism — `AbortController` still works as expected:

```ts
const controller = new AbortController()

api.get('/search', { signal: controller.signal }).catch((error) => {
  if (error.name === 'CanceledError') return // expected
  throw error
})

controller.abort()
```

The `abort` lifecycle event fires for cancellations, which is useful for distinguishing "the user navigated away" from a genuine failure in your `onEvent` handler — treat `abort` as a no-op in most monitoring pipelines rather than an error.

## Combining Auth + Retry + Events

A realistic production configuration typically combines all three lifecycle pieces:

```ts
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 8000,
  codeminity: {
    // auth
    getToken: async () => authStore.accessToken,
    refreshToken: async () => authStore.refresh(),

    // retry
    retries: 3,
    retryOnStatuses: [408, 429, 500, 502, 503, 504],
    getRetryDelay: (attempt) => Math.min(2 ** attempt * 200, 5000),

    // events
    onEvent: async (event, error) => {
      if (event === 'auth_refresh_failed') {
        authStore.clear()
        router.push('/login')
        return
      }
      monitoring.track('api_error', { event, status: error.response?.status })
    }
  }
})
```

Reading order matters here for anyone maintaining this later: auth resolves first (does this request even get to send with a valid token), retry governs what happens on transient failure, and events are the observability layer wrapping both.

## Feature-Flagged Lifecycle Behavior

For gradual rollouts (e.g., testing a new retry policy on a subset of traffic), keep the flag check outside the `codeminity` config object rather than inside callback bodies, so the resulting config is easy to log/debug:

```ts
const retryConfig = featureFlags.isEnabled('aggressive-retry')
  ? { retries: 5, getRetryDelay: (a: number) => a * 500 }
  : { retries: 2, retryDelay: 1000 }

const api = axios.create({
  codeminity: {
    getToken,
    ...retryConfig
  }
})
```

## Multi-Backend Applications

When talking to several backends with different auth schemes (e.g., one OAuth-based, one API-key-based):

```ts
const oauthApi = axios.create({
  baseURL: 'https://oauth-service.example.com',
  codeminity: { getToken: getOAuthToken, refreshToken: refreshOAuthToken }
})

const apiKeyService = axios.create({
  baseURL: 'https://legacy-service.example.com',
  codeminity: { getToken: async () => process.env.LEGACY_API_KEY }
})
```

Because refresh coordination is scoped per instance (see [ARCHITECTURE.md](../../ARCHITECTURE.md#instance-isolation)), these two clients won't interfere with each other even though both use the `getToken` mechanism differently.

## Server-Side Rendering Considerations

In SSR contexts, avoid creating a module-level singleton client that captures a per-request token in a closure — this can leak one user's token into another user's request if the client is reused across requests on the server:

```ts
// ❌ Avoid: shared module-level client capturing per-request state
let currentUserToken: string
export const api = axios.create({
  codeminity: { getToken: async () => currentUserToken }
})

// ✅ Prefer: a client created fresh per request/handler
export function createRequestScopedApi(userToken: string) {
  return axios.create({
    baseURL: 'https://api.example.com',
    codeminity: { getToken: async () => userToken }
  })
}
```

On the client/browser side, a single long-lived singleton is fine since there's only one user per browser session.

## Testing Strategy for Larger Applications

- **Unit test** business logic (`services/`) against a mocked API client — don't spin up real HTTP in unit tests.
- **Integration test** the client factory (`create-client.ts`) against a mock HTTP server to verify auth headers, retry counts, and event emission end-to-end.
- **Contract test** critical endpoints (payments, auth) separately, since these are the ones where retry/idempotency mistakes are most costly.
- Keep a small suite of concurrency tests specifically for refresh coordination — this is the area most prone to regressions, per [DECISIONS.md](../../DECISIONS.md#adr-004-refresh-coordination-scope--per-instance-vs-shared).

## Upgrading Safely

- Read the changelog for changes to default behavior, not just new features — defaults for retry and instance scoping are the kind of thing that can change silently between versions.
- Pin `@codeminity/axios` and `@codeminity/request-core` to compatible versions rather than letting them drift independently, since lifecycle behavior is split across both packages (see [ARCHITECTURE.md](../../ARCHITECTURE.md#dependency-rules)).
- After upgrading, re-run your concurrency and idempotency tests specifically — these are the behaviors most likely to shift even in otherwise-compatible releases.
