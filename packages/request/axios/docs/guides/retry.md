# Guide: Retry

This guide covers retry strategies beyond the basics in the [README](../../README.md#retry) — backoff patterns, error classification, and idempotency considerations.

---

## Table of Contents

- [Recap: Basic Retry](#recap-basic-retry)
- [Backoff Strategies](#backoff-strategies)
- [Error Classification](#error-classification)
- [Idempotency: What's Safe to Retry](#idempotency-whats-safe-to-retry)
- [Combining Retry with Auth](#combining-retry-with-auth)
- [Per-Endpoint Retry Policies](#per-endpoint-retry-policies)
- [Observability for Retries](#observability-for-retries)
- [Testing Retry Behavior](#testing-retry-behavior)
- [Common Pitfalls](#common-pitfalls)

---

## Recap: Basic Retry

```ts
const api = axios.create({
  codeminity: {
    retries: 3,
    retryDelay: 1000,
    retryOnStatuses: [408, 429, 500, 502, 503, 504]
  }
})
```

Nothing retries unless `retries` (or `shouldRetry`) is set — see [ADR-003](../../DECISIONS.md#adr-003-retry-and-auth-are-opt-in-never-automatic).

## Backoff Strategies

### Linear Backoff

```ts
codeminity: {
  retries: 5,
  getRetryDelay: (attempt) => attempt * 1000, // 1s, 2s, 3s, 4s, 5s
}
```

### Exponential Backoff

```ts
codeminity: {
  retries: 5,
  getRetryDelay: (attempt) => Math.min(2 ** attempt * 100, 10_000), // 200ms, 400ms, 800ms... capped at 10s
}
```

### Exponential Backoff With Jitter

Uncapped exponential backoff across many concurrent clients can cause a "thundering herd" retrying in lockstep. Adding jitter spreads retries out:

```ts
codeminity: {
  retries: 5,
  getRetryDelay: (attempt) => {
    const base = Math.min(2 ** attempt * 100, 10_000)
    return base / 2 + Math.random() * (base / 2) // randomize the top half
  },
}
```

### Respecting `Retry-After`

If the API returns a `Retry-After` header (common with `429`), prefer honoring it over a fixed backoff curve:

```ts
codeminity: {
  retries: 5,
  getRetryDelay: (attempt, error) => {
    const retryAfter = error?.response?.headers?.['retry-after']
    if (retryAfter) return Number(retryAfter) * 1000
    return attempt * 1000
  },
}
```

> Check your installed version's type definitions for the exact `getRetryDelay` signature — some versions may only pass `attempt`, in which case reading `Retry-After` would need to happen inside a custom `shouldRetry`/`onEvent` combination instead.

## Error Classification

Use `shouldRetry` when status-code lists aren't precise enough — for example, retrying `500` only for specific error codes returned in the response body:

```ts
codeminity: {
  retries: 3,
  shouldRetry: (error, attempt) => {
    if (attempt > 3) return false
    if (error.code === 'ECONNABORTED') return true // timeout
    if (!error.response) return true // network error, no response at all
    if (error.response.status === 429) return true
    if (error.response.status === 500 && error.response.data?.code === 'TRANSIENT') return true
    return false
  },
}
```

General rule of thumb for classification:

| Situation                   | Retry?                                    |
| --------------------------- | ----------------------------------------- |
| Network error / no response | Usually yes                               |
| Timeout                     | Usually yes                               |
| `408 Request Timeout`       | Yes                                       |
| `429 Too Many Requests`     | Yes, respecting backoff/`Retry-After`     |
| `500/502/503/504`           | Often yes, if the operation is idempotent |
| `400/401/403/404/409/422`   | No — these are not transient              |

## Idempotency: What's Safe to Retry

Retry is safe by default for `GET` requests. For `POST`/`PATCH`/`PUT`/`DELETE`, only enable retry when the operation is genuinely idempotent or when your backend deduplicates via an idempotency key:

```ts
await api.post('/payments', payload, {
  headers: { 'Idempotency-Key': paymentId },
  codeminity: { retries: 2, retryOnStatuses: [502, 503, 504] }
})
```

Without an idempotency key, retrying a `POST` that timed out — but actually succeeded server-side before the timeout — can create a duplicate resource (a duplicate charge, a duplicate order). Treat mutating endpoints as **retry-off by default**, and only opt specific, verified-safe endpoints in.

## Combining Retry with Auth

If a request fails with `401`, that's an authentication concern (handled via refresh), not a retry concern — the two systems are designed to compose rather than overlap: refresh handles `401`, retry handles transient infrastructure failures. Avoid also listing `401` in `retryOnStatuses`, since retrying without a fresh token will just fail again.

## Per-Endpoint Retry Policies

Global retry config is a good default; use request-level overrides for exceptions:

```ts
const api = axios.create({
  codeminity: { retries: 3, retryOnStatuses: [502, 503, 504] }
})

// A slow reporting endpoint: fewer retries, longer delay
await api.get('/reports/annual', {
  codeminity: { retries: 1, retryDelay: 5000 }
})

// A payment endpoint: no automatic retry at all
await api.post('/payments', payload, {
  codeminity: { retries: 0 }
})
```

## Observability for Retries

Pair retry configuration with `onEvent` so retries are visible, not silent:

```ts
const api = axios.create({
  codeminity: {
    retries: 3,
    onEvent: async (event, error) => {
      monitoring.increment(`http.${event}`, { status: error.response?.status })
    }
  }
})
```

If you see retry-related events spiking for a specific endpoint, that's usually a sign the endpoint needs attention upstream rather than a higher retry count.

## Testing Retry Behavior

- Use a mock server that fails N times then succeeds, and assert the client succeeds after exactly N retries — not more, not fewer.
- Test that non-retryable statuses (`404`, `422`) are **not** retried, to guard against overly broad `shouldRetry` logic.
- Test `getRetryDelay` in isolation as a pure function — it doesn't need network mocking.

## Common Pitfalls

- **Retrying non-idempotent mutations without an idempotency key.**
- **Setting a high `retries` count with no backoff**, which can hammer a struggling service harder right when it needs load to drop.
- **Listing `401` in `retryOnStatuses`** instead of relying on the auth/refresh lifecycle.
- **Assuming retries are on by default.** They're not — see [ADR-003](../../DECISIONS.md#adr-003-retry-and-auth-are-opt-in-never-automatic).
