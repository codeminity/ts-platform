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
const api = axios.create({
  codeminity: {
    onEvent: async (event, error) => {
      console.log(event)
      console.error(error)
    }
  }
})
```

Events cover network failures, timeouts, cancellations, auth failures, and classified HTTP status errors — see the full table in the [README](../../README.md#available-events).

## Building a Custom Error Pipeline

Rather than a single flat `onEvent` handler, route events through a small pipeline of handlers so each concern stays isolated and testable:

```ts
type EventHandler = (event: string, error: any) => void | Promise<void>

const handlers: EventHandler[] = [logToConsoleInDev, reportToMonitoring, handleAuthEvents]

const api = axios.create({
  codeminity: {
    onEvent: async (event, error) => {
      for (const handler of handlers) {
        await handler(event, error)
      }
    }
  }
})

function logToConsoleInDev(event: string, error: any) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[api:${event}]`, error?.message)
  }
}

function reportToMonitoring(event: string, error: any) {
  monitoring.track('api_error', { event, status: error?.response?.status })
}

function handleAuthEvents(event: string) {
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
onEvent: async (event, error) => {
  monitoring.track('api_error', {
    event,
    status: error.response?.status,
    method: error.config?.method,
    url: error.config?.url // ensure this doesn't include tokens in query params
  })
}
```

### Sampling High-Volume Events

If `network` or `timeout` events are extremely frequent (e.g., during an outage), consider sampling to avoid overwhelming your monitoring pipeline:

```ts
onEvent: async (event, error) => {
  if (event === 'network' && Math.random() > 0.1) return // sample 10%
  monitoring.track('api_error', { event })
}
```

### Severity Mapping

Not all events deserve the same alerting severity:

```ts
const severity: Record<string, 'info' | 'warn' | 'error'> = {
  not_found: 'info',
  too_many_requests: 'warn',
  unauthorized: 'warn',
  auth_refresh_failed: 'error',
  internal_error: 'error',
  bad_gateway: 'error',
  service_unavailable: 'error'
}

onEvent: async (event, error) => {
  monitoring.log(severity[event] ?? 'warn', event, error)
}
```

## Turning Events into User-Facing Behavior

Events are lifecycle signals, not UI logic — keep the mapping from event to user-facing message in application code, not inside the `onEvent` callback itself:

```ts
const api = axios.create({
  codeminity: {
    onEvent: (event) => eventBus.emit('api-event', event)
  }
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

For tracing, attach a request ID at the interceptor boundary via a custom Axios request interceptor (independent of `codeminity`), and read it back off `error.config` inside `onEvent`:

```ts
api.interceptors.request.use((config) => {
  config.headers['X-Request-Id'] = crypto.randomUUID()
  return config
})

const api = axios.create({
  codeminity: {
    onEvent: (event, error) => {
      monitoring.track('api_error', {
        event,
        requestId: error.config?.headers?.['X-Request-Id']
      })
    }
  }
})
```

This lets you correlate a lifecycle event with server-side logs sharing the same request ID.

## Application-Wide Error Strategy

A reasonable default strategy for most applications:

1. **Network/timeout events** → retry (via `codeminity.retries`) + log at `warn`.
2. **Auth events** → handled by the refresh lifecycle automatically; `auth_refresh_failed` → clear session, redirect to login.
3. **4xx events** (`bad_request`, `not_found`, `unprocessable_entity`) → treat as application logic errors, surface to the caller, don't retry, log at `info`/`debug`.
4. **429** → respect backoff, surface a "slow down" message if user-initiated.
5. **5xx events** → retry with backoff if idempotent, log at `error`, alert if sustained.

Keep this mapping in one place (e.g., a single `handleApiEvent` module) rather than scattering `if (event === '...')` checks across the codebase.

## Testing Event Handlers

- Unit test each handler function directly — they should be plain functions of `(event, error)` with no hidden dependency on the Axios instance.
- For integration tests, use a mock server returning specific status codes and assert the corresponding event fires with the expected payload shape.
- Test that `onError` is still called for errors that don't map to any classified `onEvent` case, if your version of the package makes that distinction — check the [API Reference](../../README.md#api-reference) for the exact contract.

## Common Pitfalls

- **Putting UI logic (toasts, redirects) directly inside `onEvent`.** Keep `onEvent` as a signal emitter; keep UI mapping separate.
- **Not sampling high-volume events**, flooding a monitoring pipeline during outages.
- **Forgetting `auth_refresh_failed` needs explicit handling** — without it, a failed refresh can leave the app silently stuck making requests that will keep failing.
- **Logging full error objects that may include the `Authorization` header** — scrub sensitive headers before sending errors to third-party logging services.
