# Guide: Events

This guide covers advanced usage of the request lifecycle event system introduced in the [README](../../README.md#events) — custom error pipelines, monitoring integration, and an application-wide error strategy.

---

## Table of Contents

- [Recap: Event Basics](#recap-event-basics)
- [Building a Custom Error Pipeline](#building-a-custom-error-pipeline)
- [Monitoring Integration Patterns](#monitoring-integration-patterns)
- [Turning Events into User-Facing Behavior](#turning-events-into-user-facing-behavior)
- [Correlating Events with Requests](#correlating-events-with-requests)
- [Application-Wide Error Strategy](#application-wide-error-strategy)
- [Testing Event Handlers](#testing-event-handlers)
- [Common Pitfalls](#common-pitfalls)

---

## Recap: Event Basics

```ts
import { createFetch } from '@codeminity/fetch'

const apiFetch = createFetch({
  onEvent: async (event, outcome) => {
    console.log(event)
    console.error(outcome.response?.status ?? outcome.error)
  }
})
```

Events cover network failures, timeouts, aborts, and classified HTTP status errors — see the full table in the [README](../../README.md#available-events). Unlike `@codeminity/axios`'s `AxiosError`, the second argument here is a `FetchOutcome`: a `response` (possibly not `ok`) _or_ an `error` (a thrown value), never both — plus `input`/`init`, the original request that produced this outcome.

## Building a Custom Error Pipeline

Rather than a single flat `onEvent` handler, route events through a small pipeline of handlers so each concern stays isolated and testable:

```ts
import { createFetch, type ErrorEvent, type FetchOutcome } from '@codeminity/fetch'

declare const monitoring: { track: (name: string, data: Record<string, unknown>) => void }
declare const sessionStore: { clear: () => void }

type EventHandler = (event: ErrorEvent, outcome: FetchOutcome) => void | Promise<void>

const handlers: EventHandler[] = [logToConsoleInDev, reportToMonitoring, handleAuthEvents]

const apiFetch = createFetch({
  onEvent: async (event, outcome) => {
    for (const handler of handlers) {
      await handler(event, outcome)
    }
  }
})

function logToConsoleInDev(event: ErrorEvent, outcome: FetchOutcome) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[api:${event}]`, outcome.response?.status ?? outcome.error)
  }
}

function reportToMonitoring(event: ErrorEvent, outcome: FetchOutcome) {
  monitoring.track('api_error', { event, status: outcome.response?.status })
}

function handleAuthEvents(event: ErrorEvent) {
  if (event === 'auth_refresh_failed') {
    sessionStore.clear()
  }
}
```

This makes it easy to add or remove a concern (e.g., disable console logging in production) without touching the others.

## Monitoring Integration Patterns

### Structured Tagging

Tag events with enough context to be useful in a dashboard, without leaking sensitive data:

```ts
import { createFetch, type ErrorEvent, type FetchOutcome } from '@codeminity/fetch'

declare const monitoring: { track: (name: string, data: Record<string, unknown>) => void }

function reportEvent(event: ErrorEvent, outcome: FetchOutcome) {
  monitoring.track('api_error', {
    event,
    status: outcome.response?.status,
    method: outcome.init.method ?? 'GET',
    url: String(outcome.input) // ensure this doesn't include tokens in query params
  })
}

const apiFetch = createFetch({
  onEvent: reportEvent
})
```

### Sampling High-Volume Events

If `network` or `timeout` events are extremely frequent (e.g., during an outage), consider sampling to avoid overwhelming your monitoring pipeline:

```ts
import { createFetch, type ErrorEvent } from '@codeminity/fetch'

declare const monitoring: { track: (name: string, data: Record<string, unknown>) => void }

function reportSampled(event: ErrorEvent) {
  if (event === 'network' && Math.random() > 0.1) return // sample 10%
  monitoring.track('api_error', { event })
}

const apiFetch = createFetch({
  onEvent: reportSampled
})
```

### Severity Mapping

Not all events deserve the same alerting severity:

```ts
import { createFetch, type ErrorEvent, type FetchOutcome } from '@codeminity/fetch'

declare const monitoring: { log: (severity: string, event: string, outcome: unknown) => void }

const severity: Partial<Record<ErrorEvent, 'info' | 'warn' | 'error'>> = {
  not_found: 'info',
  too_many_requests: 'warn',
  unauthorized: 'warn',
  auth_refresh_failed: 'error',
  internal_error: 'error',
  bad_gateway: 'error',
  service_unavailable: 'error'
}

function reportBySeverity(event: ErrorEvent, outcome: FetchOutcome) {
  monitoring.log(severity[event] ?? 'warn', event, outcome)
}

const apiFetch = createFetch({
  onEvent: reportBySeverity
})
```

## Turning Events into User-Facing Behavior

Events are lifecycle signals, not UI logic — keep the mapping from event to user-facing message in application code, not inside the `onEvent` callback itself:

```ts
import { createFetch, type ErrorEvent } from '@codeminity/fetch'

declare const eventBus: {
  emit: (name: string, event: ErrorEvent) => void
  on: (name: string, handler: (event: ErrorEvent) => void) => void
}

declare const toast: { warn: (message: string) => void; error: (message: string) => void }

const apiFetch = createFetch({
  onEvent: (event) => eventBus.emit('api-event', event)
})

// elsewhere, in a UI layer
eventBus.on('api-event', (event) => {
  if (event === 'too_many_requests') {
    toast.warn('You are doing that too much — please slow down.')
  }
  if (event === 'service_unavailable') {
    toast.error('The service is temporarily unavailable.')
  }
})
```

This keeps `onEvent` itself framework-agnostic and easy to test, while the UI-specific mapping lives where UI concerns belong.

## Correlating Events with Requests

Since `FetchOutcome` carries the original `input`/`init`, you can attach a request ID yourself and read it back in `onEvent` — no interceptor mechanism is needed, unlike `@codeminity/axios`:

```ts
import { createFetch, type ErrorEvent, type FetchOutcome } from '@codeminity/fetch'

declare const monitoring: { track: (name: string, data: Record<string, unknown>) => void }

function reportWithRequestId(event: ErrorEvent, outcome: FetchOutcome) {
  const requestId = new Headers(outcome.init.headers).get('X-Request-Id')

  monitoring.track('api_error', { event, requestId })
}

const apiFetch = createFetch({
  onEvent: reportWithRequestId
})

const requestId = crypto.randomUUID()

await apiFetch('/checkout', {
  headers: { 'X-Request-Id': requestId }
})
```

This lets you correlate a lifecycle event with server-side logs sharing the same request ID.

## Application-Wide Error Strategy

A reasonable default strategy for most applications:

1. **Network/timeout events** → retry (via `codeminity.retries`) + log at `warn`.
2. **Auth events** → handled by the refresh lifecycle automatically; `auth_refresh_failed` → clear session, redirect to login.
3. **4xx events** (`bad_request`, `not_found`, `unprocessable_entity`) → treat as application logic errors, surface to the caller via `response.status`, don't retry, log at `info`/`debug`.
4. **429** → respect backoff, surface a "slow down" message if user-initiated.
5. **5xx events** → retry with backoff if idempotent, log at `error`, alert if sustained.

Keep this mapping in one place (e.g., a single `handleApiEvent` module) rather than scattering `if (event === '...')` checks across the codebase.

## Testing Event Handlers

- Unit test each handler function directly — they should be plain functions of `(event, outcome)` with no hidden dependency on `fetch` itself.
- For integration tests, stub `globalThis.fetch` to return specific status codes and assert the corresponding event fires with the expected `FetchOutcome` shape.
- `onEvent`/`onError` both fire once, on the attempt that ends the retry loop — assert they aren't called for intermediate retried attempts.

## Common Pitfalls

- **Putting UI logic (toasts, redirects) directly inside `onEvent`.** Keep `onEvent` as a signal emitter; keep UI mapping separate.
- **Not sampling high-volume events**, flooding a monitoring pipeline during outages.
- **Forgetting `auth_refresh_failed` needs explicit handling** — without it, a failed refresh can leave the app silently stuck making requests that will keep failing.
- **Logging `outcome.init` directly.** It's the pre-auth request (never includes the `Authorization` header this package attaches — see [DECISIONS.md](../../DECISIONS.md)), but it can still carry other sensitive headers you set yourself (API keys, cookies). Log specific fields, not the whole object.
- **Assuming `onEvent` fires for successful retries.** It only fires on the attempt that ends the retry loop — a request that fails twice then succeeds on the third attempt never triggers `onEvent` at all.
