# Architecture Decisions

This document records significant design decisions for `@codeminity/fetch`, using a lightweight ADR (Architecture Decision Record) format: **Context → Decision → Consequences**. New entries should be appended, not inserted, so this file reads as a timeline.

---

## Index

- [ADR-001: Mirror native `fetch`'s resolve/throw contract exactly](#adr-001-mirror-native-fetchs-resolvethrow-contract-exactly)
- [ADR-002: No custom `timeout` config — classify `AbortSignal.timeout()` instead](#adr-002-no-custom-timeout-config--classify-abortsignaltimeout-instead)
- [ADR-003: No default export](#adr-003-no-default-export)
- [ADR-004: Streaming request bodies + retries is a documented limitation, not solved](#adr-004-streaming-request-bodies--retries-is-a-documented-limitation-not-solved)
- [ADR-005: A broken `shouldRetry`/`getRetryDelay` fails safe, not loud](#adr-005-a-broken-shouldretrygetretrydelay-fails-safe-not-loud)
- [ADR-006: A `NaN` `retries` value is treated as zero](#adr-006-a-nan-retries-value-is-treated-as-zero)

---

## ADR-001: Mirror native `fetch`'s resolve/throw contract exactly

**Context:** Native `fetch` never throws for HTTP error statuses (404, 500, etc.) — it only throws for network failures or aborts; callers check `response.ok` themselves. `@codeminity/axios` throws on non-2xx responses instead, matching Axios's own contract. When designing this package, both options were on the table: match `fetch`'s real behavior, or match axios's adapter for cross-adapter consistency.

**Decision:** `createFetch`'s returned function always resolves with the `Response`, even on 4xx/5xx — it only rejects for network failures, aborts, or timeouts, exactly like calling `fetch()` directly. Retry decisions and `onEvent`/`onError` callbacks are driven internally off `response.status` before the promise settles, but the final settlement always matches what plain `fetch` would have done for that same outcome.

**Consequences:** This is a genuine behavioral difference from `@codeminity/axios` — `try/catch` around a 404 catches nothing here, where it would with the axios adapter. That's intentional: each adapter is faithful to its own transport's actual contract rather than converging on one invented cross-adapter error shape (see `ARCHITECTURE.md#relationship-to-codeminityaxios`). It also means `onEvent`/`onError` can't receive a single uniform "error" object the way axios's `AxiosError` does — see `FetchOutcome` (`{ response?, error? }`) in `src/errors/fetch-outcome.interface.ts`, which callbacks receive instead. This was the harder, more honest test of `@codeminity/request-core`'s transport-agnostic boundary, and is treated as the reference behavior for any future adapter built directly over a non-throwing transport.

---

## ADR-002: No custom `timeout` config — classify `AbortSignal.timeout()` instead

**Context:** `@codeminity/axios` has a `timeout` option (backed by Axios's own `ECONNABORTED` code) distinct from user-initiated cancellation. Native `fetch` has no built-in `timeout` option, but the platform already provides `AbortSignal.timeout(ms)`, which a caller can pass as `init.signal` to get the same effect, producing a `DOMException` named `TimeoutError` when it fires (distinct from a manually-triggered `AbortController.abort()`, which produces `AbortError`).

**Decision:** No `timeout` config field is added to `Config`/`RequestConfig`. Instead, `src/errors/outcome-to-event.ts` classifies the abort _reason_: a `TimeoutError` DOMException maps to the `'timeout'` event, an `AbortError` DOMException maps to `'abort'` — the same two events axios exposes, with zero new configuration surface. Callers who want a per-request or per-instance timeout pass `signal: AbortSignal.timeout(ms)` themselves (or merge it with their own signal).

**Consequences:** Consumers coming from `@codeminity/axios` need to know there's no `timeout` option here — the migration is "pass `AbortSignal.timeout(ms)` as `init.signal`" rather than "pass `timeout: ms`" — should be called out explicitly in the README and any future migration guide. The upside: this package never has to duplicate or fight with the platform's own timeout primitive, and correctly composes with a caller's own `AbortController` for manual cancellation.

---

## ADR-003: No default export

**Context:** `@codeminity/axios`'s default export mimics `import axios from 'axios'` for parity with plain Axios's own convention — a pre-configured, singleton-like callable object. `fetch` itself is a global with no import required at all (`fetch(...)` just works, everywhere), so there's no equivalent "the library's own default import" convention to mirror.

**Decision:** `createFetch` is the sole entry point (a named export), matching `@codeminity/axios`'s named `create`. No default export is provided.

**Consequences:** There's no singleton-adjacent instance to reach for by accident (unlike axios's documented default-export exception — see `@codeminity/axios/ARCHITECTURE.md#instance-isolation`); every consumer explicitly calls `createFetch(config)` and gets a fully isolated instance, with no special case to document or misuse.

---

## ADR-004: Streaming request bodies + retries is a documented limitation, not solved

**Context:** If `init.body` is a `ReadableStream`, the Fetch spec consumes it after one `fetch()` call — a second `fetch()` call reusing the same `init.body` on retry would throw. This only matters when a caller both streams a request body _and_ opts into `retries` (off by default).

**Decision:** This package does not buffer or clone stream bodies to make them retry-safe. It's documented as a known limitation in the README: don't combine a `ReadableStream` request body with `retries > 0`.

**Consequences:** Keeps the retry implementation simple and avoids silently buffering arbitrarily large streams into memory on every consumer's behalf. A caller who genuinely needs both (rare — most retryable requests have small, buffer-friendly bodies: JSON, form data) is responsible for constructing a fresh body per attempt themselves, e.g. via a custom `shouldRetry`/manual retry loop instead of this package's built-in one.

---

## ADR-005: A broken `shouldRetry`/`getRetryDelay` fails safe, not loud

**Context:** `handleRetry` called the user-supplied `shouldRetry`/`getRetryDelay` with no try/catch. If either threw — a bug in the caller's own predicate — the exception replaced the original `FetchOutcome` all the way up the call stack, and `onEvent`/`onError` never fired for the real failure, since the code path that calls them sits after the now-aborted `handleRetry` call.

**Decision:** `handleRetry` catches a throw from `shouldRetry` and treats it as "don't retry" (`false`), and catches a throw from `getRetryDelay` and falls back to `config.retryDelay ?? 0`, in both cases exactly as if the callback had returned normally with the safe default.

**Consequences:** A bug in a caller's own retry callback no longer masks the real failure or silently drops its lifecycle event — the original outcome still reaches `onEvent`/`onError` unchanged. The tradeoff: the callback's own exception is swallowed with no signal of its own, matching how `emitterCallback` already swallows a failing `onEvent`/`onError` — consistent with this package's existing house style rather than introducing new logging infrastructure for one callback family.

---

## ADR-006: A `NaN` `retries` value is treated as zero

**Context:** `shouldRetry` computed `attempt > (config.retries ?? 0)` to decide whether the retry budget is exhausted. `attempt > NaN` is always `false` in JavaScript, so a `NaN` `retries` value silently defeated the retry cap entirely — retries would continue unbounded as long as `retryOnStatuses`/`shouldRetry` kept matching. Unlike a type-bypassed non-function callback, this is reachable with fully type-correct code: `retries` is typed as `number`, and `NaN` is a valid `number` — a caller computing it from something like `someValue / someOtherCount` gets `NaN` for free the moment the denominator is `0`, no `as` cast required.

**Decision:** `shouldRetry` treats a `NaN` `retries` the same as an unconfigured one: zero, meaning "don't retry."

**Consequences:** A `retries` value that resolves to `NaN` at runtime fails safe (no retries) instead of failing open (unbounded retries), consistent with [ADR-005](#adr-005-a-broken-shouldretrygetretrydelay-fails-safe-not-loud)'s reasoning. Deliberately narrower than "validate all config inputs" — a non-function `getToken`/`refreshToken` etc. is a different class of problem (only reachable via an explicit type-bypass) and is left alone; this fix is scoped to the one value that's reachable through ordinary, type-correct arithmetic.

---

## Adding a New ADR

When proposing a decision that affects public behavior, configuration shape, or cross-instance state, add a new numbered entry above using the same **Context → Decision → Consequences** structure, and cross-link it from [CONTRIBUTING.md](./CONTRIBUTING.md) if it changes the contribution workflow.
