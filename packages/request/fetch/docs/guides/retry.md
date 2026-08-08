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
import { createFetch } from '@codeminity/fetch'

const apiFetch = createFetch({
  retries: 3,
  retryDelay: 1000,
  retryOnStatuses: [408, 429, 500, 502, 503, 504]
})
```

Nothing retries unless `retries` (or `shouldRetry`) is set. Network failures and `AbortSignal.timeout()` timeouts are retried by default even without `retryOnStatuses` — see the [README](../../README.md#retry-status-codes).

## Backoff Strategies

### Linear Backoff

```ts
import type { RetryConfig } from '@codeminity/fetch'

const config: RetryConfig = {
  retries: 5,
  getRetryDelay: (attempt) => attempt * 1000 // 1s, 2s, 3s, 4s, 5s
}
```

### Exponential Backoff

```ts
import type { RetryConfig } from '@codeminity/fetch'

const config: RetryConfig = {
  retries: 5,
  getRetryDelay: (attempt) => Math.min(2 ** attempt * 100, 10_000) // 200ms, 400ms, 800ms... capped at 10s
}
```

### Exponential Backoff With Jitter

Uncapped exponential backoff across many concurrent clients can cause a "thundering herd" retrying in lockstep. Adding jitter spreads retries out:

```ts
import type { RetryConfig } from '@codeminity/fetch'

const config: RetryConfig = {
  retries: 5,
  getRetryDelay: (attempt) => {
    const base = Math.min(2 ** attempt * 100, 10_000)
    return base / 2 + Math.random() * (base / 2) // randomize the top half
  }
}
```

### Respecting `Retry-After`

A `Retry-After` response header (common with `429`) is honored automatically — no configuration needed. It's read from the failed response, supports both the numeric-seconds and HTTP-date header forms, and boosts the delay whenever it asks for longer than the configured `retryDelay` would otherwise wait:

```ts
import { createFetch } from '@codeminity/fetch'

const apiFetch = createFetch({
  retries: 5,
  retryDelay: 1000, // used as-is when the server sends no Retry-After, or a shorter one
  retryOnStatuses: [429]
})
```

The honored value is capped at 5 minutes, so a misconfigured or malicious upstream can't stall a client indefinitely. A configured `getRetryDelay` is a full override of the default backoff — same as `shouldRetry` — so setting it opts out of the automatic `Retry-After` boost entirely; read the header yourself inside it if you need both:

```ts
import type { RetryConfig } from '@codeminity/fetch'

const config: RetryConfig = {
  retries: 5,
  retryOnStatuses: [429],
  getRetryDelay: (_attempt, outcome) => {
    const retryAfter = outcome.response?.headers.get('retry-after')
    return retryAfter ? Number(retryAfter) * 1000 : 1000
  }
}
```

## Error Classification

Use `shouldRetry` when status-code lists aren't precise enough:

```ts
import type { RetryConfig } from '@codeminity/fetch'

const config: RetryConfig = {
  retries: 3,
  shouldRetry: (outcome, attempt) => {
    if (attempt > 3) return false
    if (outcome.error instanceof DOMException && outcome.error.name === 'TimeoutError') return true
    if (!outcome.response) return true // network error, no response at all
    if (outcome.response.status === 429) return true
    if (outcome.response.status >= 500) return true

    return false
  }
}
```

`shouldRetry` is synchronous and runs before the response body has been read — it can inspect `outcome.response.status` and `outcome.response.headers`, but not the parsed body (reading it would consume the stream before the caller ever sees it). If you need body-based retry decisions, read a cloned response inside `onEvent` for observability instead, or handle that specific endpoint's retry loop manually.

General rule of thumb for classification:

| Situation                         | Retry?                                    |
| --------------------------------- | ----------------------------------------- |
| Network error / no response       | Usually yes                               |
| Timeout (`AbortSignal.timeout()`) | Usually yes                               |
| `408 Request Timeout`             | Yes                                       |
| `429 Too Many Requests`           | Yes, respecting backoff/`Retry-After`     |
| `500/502/503/504`                 | Often yes, if the operation is idempotent |
| `400/401/403/404/409/422`         | No — these are not transient              |

## Idempotency: What's Safe to Retry

Retry is safe by default for `GET` requests. For `POST`/`PATCH`/`PUT`/`DELETE`, only enable retry when the operation is genuinely idempotent or when your backend deduplicates via an idempotency key:

```ts
import { createFetch } from '@codeminity/fetch'

declare const apiFetch: ReturnType<typeof createFetch>
declare const payload: Record<string, unknown>
declare const paymentId: string

await apiFetch('/payments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Idempotency-Key': paymentId },
  body: JSON.stringify(payload),
  codeminity: { retries: 2 }
})
```

> Per-request overrides only support `retries`/`retryDelay`/`skipAuth` — status-list/backoff-shape customization (`retryOnStatuses`, `getRetryDelay`, `shouldRetry`) is instance-config only.

Without an idempotency key, retrying a `POST` that timed out — but actually succeeded server-side before the timeout — can create a duplicate resource (a duplicate charge, a duplicate order). Treat mutating endpoints as **retry-off by default**, and only opt specific, verified-safe endpoints in.

## Combining Retry with Auth

A `401` is an authentication concern, not a generic retry concern — see [the Authentication guide's Reactive Refresh section](./authentication.md#reactive-refresh-on-401) for how the two are meant to compose. Listing `401` in `retryOnStatuses` without also driving `isTokenExpired` from the retry decision will just retry with the same stale token and fail again.

## Per-Endpoint Retry Policies

Instance-level retry config is a good default; use request-level overrides for exceptions:

```ts
import { createFetch } from '@codeminity/fetch'

const apiFetch = createFetch({ retries: 3, retryOnStatuses: [502, 503, 504] })

// A slow reporting endpoint: fewer retries, longer delay
await apiFetch('/reports/annual', {
  codeminity: { retries: 1, retryDelay: 5000 }
})

// A payment endpoint: no automatic retry at all
await apiFetch('/payments', {
  method: 'POST',
  codeminity: { retries: 0 }
})
```

## Observability for Retries

`onEvent` only fires once, on the attempt that ends the retry loop — pair it with a counter of your own if you need visibility into how many attempts a request took:

```ts
import { createFetch, type ErrorEvent, type FetchOutcome } from '@codeminity/fetch'

declare const monitoring: { increment: (metric: string, tags?: Record<string, unknown>) => void }

function reportRetryExhausted(event: ErrorEvent, outcome: FetchOutcome): void {
  monitoring.increment(`http.${event}`, { status: outcome.response?.status })
}

const apiFetch = createFetch({
  retries: 3,
  onEvent: reportRetryExhausted
})
```

If you see these events spiking for a specific endpoint, that's usually a sign the endpoint needs attention upstream rather than a higher retry count.

## Testing Retry Behavior

- Stub `globalThis.fetch` to fail N times then succeed, and assert the client succeeds after exactly N retries — not more, not fewer.
- Test that non-retryable statuses (`404`, `422`) are **not** retried, to guard against overly broad `shouldRetry` logic.
- Test `getRetryDelay` in isolation as a pure function — it doesn't need network mocking.

## Common Pitfalls

- **Retrying non-idempotent mutations without an idempotency key.**
- **Setting a high `retries` count with no backoff**, which can hammer a struggling service harder right when it needs load to drop.
- **Listing `401` in `retryOnStatuses`** without also making the retry decision flip `isTokenExpired`, instead of relying on the auth/refresh lifecycle to do the right thing on its own — it won't, see [Combining Retry with Auth](#combining-retry-with-auth).
- **Assuming retries are on by default.** They're not.
- **Trying to read the response body inside `shouldRetry`.** It's synchronous — see [Error Classification](#error-classification).
- **Assuming a bug in `shouldRetry`/`getRetryDelay` surfaces as an error.** It doesn't — a throw is caught and treated as its safe default (`shouldRetry` → don't retry, `getRetryDelay` → fall back to `retryDelay`/`0`), so the _original_ request failure is what your `onEvent`/`onError` sees, not a bug in your own callback. See [DECISIONS.md](../../DECISIONS.md#adr-005-a-broken-shouldretrygetretrydelay-fails-safe-not-loud).
