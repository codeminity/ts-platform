# Architecture Decisions

This document records significant design decisions for `@codeminity/axios`, using a lightweight ADR (Architecture Decision Record) format: **Context → Decision → Consequences**. New entries should be appended, not inserted, so this file reads as a timeline.

---

## Index

- [ADR-001: Thin adapter over Axios, not a new HTTP client](#adr-001-thin-adapter-over-axios-not-a-new-http-client)
- [ADR-002: Lifecycle logic lives in `@codeminity/request-core`, not in this package](#adr-002-lifecycle-logic-lives-in-codeminityrequest-core-not-in-this-package)
- [ADR-003: Retry and auth are opt-in, never automatic](#adr-003-retry-and-auth-are-opt-in-never-automatic)
- [ADR-004: Refresh coordination scope — per-instance vs. shared](#adr-004-refresh-coordination-scope--per-instance-vs-shared)
- [ADR-005: `shouldRetry` is a full override, not an additional filter](#adr-005-shouldretry-is-a-full-override-not-an-additional-filter)
- [ADR-006: Per-request retry config is merged with global config, not replaced](#adr-006-per-request-retry-config-is-merged-with-global-config-not-replaced)
- [ADR-007: `skipAuth` takes precedence over `tokenMode: COOKIE`](#adr-007-skipauth-takes-precedence-over-tokenmode-cookie)
- [ADR-008: `onError` always fires alongside `onEvent`](#adr-008-onerror-always-fires-alongside-onevent)
- [ADR-009: A broken `shouldRetry`/`getRetryDelay` fails safe, not loud](#adr-009-a-broken-shouldretrygetretrydelay-fails-safe-not-loud)

---

## ADR-001: Thin adapter over Axios, not a new HTTP client

**Context:** Teams already have significant investment in Axios — code, interceptors, mental model, and third-party middleware. A brand-new HTTP client abstraction would require a full rewrite to adopt.

**Decision:** `@codeminity/axios` wraps Axios and preserves its API surface exactly (`axios.create()`, `.get/.post/.put/.patch/.delete`, interceptors), adding only an optional `codeminity` configuration key.

**Consequences:** Adoption cost is close to zero for existing Axios users. The tradeoff is that we inherit Axios's own API constraints and can't diverge from its request/response shape even where a cleaner design might otherwise be possible.

---

## ADR-002: Lifecycle logic lives in `@codeminity/request-core`, not in this package

**Context:** Auth lifecycle, refresh coordination, and retry orchestration are transport-independent concerns. If they were implemented directly inside the Axios adapter, sharing them with any other transport adapter would have meant duplicating the logic rather than reusing it.

**Decision:** All non-Axios-specific logic is implemented in `@codeminity/request-core`, which has no dependency on Axios. `@codeminity/axios` is limited to interceptor wiring and configuration forwarding.

**Consequences:** Other adapters can share the same tested lifecycle engine instead of reimplementing it — [`@codeminity/fetch`](../fetch) is the package that proved this out, and any adapter added later follows the same path. Adds one extra package boundary to reason about, and any change to lifecycle behavior requires touching two packages (or at minimum, understanding which one owns the change) — see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## ADR-003: Retry and auth are opt-in, never automatic

**Context:** Silent automatic retries can turn non-idempotent operations (payments, order creation) into duplicated side effects. Silent automatic auth can mask misconfiguration.

**Decision:** No retry happens unless `retries` (or a custom `shouldRetry`) is configured. No token is attached unless `getToken` is configured. Defaults are "do nothing" rather than "do something reasonable-sounding."

**Consequences:** Slightly more setup required per project, but behavior is fully predictable and there are no surprising background requests. This is treated as a hard constraint for future features as well: anything added to the lifecycle should default to off.

---

## ADR-004: Refresh coordination scope — per-instance vs. shared

**Context:** When multiple requests hit an expired token concurrently, only one refresh operation should run. The open question is whether that coordination should be scoped to a single Axios instance (`axios.create()` call) or shared globally across every instance in a process.

**Status:** This is called out explicitly because it's the kind of detail that's easy to get wrong in either direction — and easy to document incorrectly relative to the actual implementation. Prior to this ADR, the README asserted "no application-wide caches or mutable global state" without that claim having been checked against the current implementation.

**Decision:** Refresh coordination **should** be scoped per Axios instance, so that two instances created with different configurations (e.g., pointed at different backends, or using different `getToken` implementations) never accidentally share an in-flight refresh. Any implementation where a refresh queue is created at module scope (shared across all `axios.create()` calls) is considered a bug against this decision, not an accepted behavior, and should be fixed at the source rather than documented as intentional.

**Consequences:** Contributors introducing any shared or singleton state in `factories/` must treat it as a design regression requiring discussion, not a minor implementation detail. Anyone integrating this package who observes refresh coordination behaving differently than "scoped per instance" is encouraged to file an issue rather than assume it's by design — this ADR is the source of truth for intended behavior, and the README/API docs should always be kept in sync with it.

---

## ADR-005: `shouldRetry` is a full override, not an additional filter

**Context:** `RetryConfig` supports both a declarative `retryOnStatuses` list and an imperative `shouldRetry(error, attempt)` predicate. An earlier implementation combined them with logical AND (`shouldRetry(...) && retryOnStatuses.includes(status)`), meaning a custom `shouldRetry` could only ever narrow what `retryOnStatuses` already allowed — it could never independently decide to retry something outside that list. This directly contradicted documented usage (`docs/guides/retry.md`, README) showing `shouldRetry` used standalone, with no `retryOnStatuses` configured at all.

**Decision:** When `shouldRetry` is provided, it is the **sole** decision-maker for that request — `retryOnStatuses` and the built-in network-error classification are not consulted at all. The built-in classification only applies when `shouldRetry` is absent.

**Consequences:** Consumers who configure both `retryOnStatuses` and `shouldRetry` together should be aware that `shouldRetry` fully takes over the decision — `retryOnStatuses` becomes inert for that request unless the custom predicate consults it itself (via `error.response?.status`). This is intentional: it matches "opt-in, predictable behavior" (ADR-003) — a config option that's silently ignored half the time is a worse outcome than one that's fully in control once specified.

---

## ADR-006: Per-request retry config is merged with global config, not replaced

**Context:** `handleResponseError` resolves the effective retry config for a failed request from two sources: the Axios instance's global `codeminity` config, and an optional per-request `codeminity` override. An earlier implementation used `requestConfig.codeminity ?? config` — a full replacement whenever _any_ per-request `codeminity` object was present, even a partial one. This broke the documented "Per-Endpoint Retry Policies" pattern, where a request overrides only `retries`/`retryDelay` and expects to still inherit the global `retryOnStatuses`.

**Decision:** Per-request retry config is shallow-merged on top of the global config (`{ ...globalConfig, ...requestConfig.codeminity }`). A per-request override replaces only the specific fields it declares; every other field falls back to the instance-level default.

**Consequences:** Per-request overrides can stay minimal (override only what's different for that endpoint) without silently losing the rest of the instance's retry behavior. Contributors adding new fields to `RetryConfig` should keep this merge semantic in mind — a field that should NOT be inherited per-request (if one is ever introduced) would need explicit handling, not just addition to the interface.

---

## ADR-007: `skipAuth` takes precedence over `tokenMode: COOKIE`

**Context:** `handleAuthRequest` checked `tokenMode === COOKIE` before checking `codeminity?.skipAuth`, and returned early on the COOKIE branch. As a result, a per-request `skipAuth: true` override had no effect when the instance was configured with `tokenMode: COOKIE` — `withCredentials` was still set to `true`. This contradicted the documented meaning of `skipAuth` ("Skip authentication handling for this request," README) and the "Skipping Authentication" example, neither of which carve out an exception for cookie mode.

**Decision:** `skipAuth` is checked first, before any `tokenMode` branching. When `skipAuth: true` is set for a request, authentication handling is skipped entirely regardless of `tokenMode` — including cookie mode, so `withCredentials` is left untouched.

**Consequences:** `skipAuth` now behaves consistently across every `tokenMode`, matching its documented contract. Anyone relying on the previous (undocumented) behavior — where cookie credentials were attached even to requests marked `skipAuth: true` — needs to remove that per-request override and instead configure `withCredentials` directly via Axios's own request config if cookies must still be sent on an unauthenticated request.

---

## ADR-008: `onError` always fires alongside `onEvent`

**Context:** `handleResponseError` (via `request-core`'s shared `emitterCallback`) always called both `onEvent` and `onError` for a classified HTTP failure, but `handleAuthRequest`'s two catch blocks called them as an either/or (`onEvent` for an `AxiosError`, `onError` otherwise) — matching this file's own documented contract at the time, but contradicting the response path's actual behavior and `@codeminity/fetch`'s already-consistent "always both" contract. A consumer configuring both callbacks got double-fired on an ordinary HTTP error but single-fired on an auth failure, with no discoverable reason why.

**Decision:** `onError` fires for every failed outcome, unconditionally, alongside `onEvent` whenever `onEvent` is also applicable. `onEvent` keeps its existing, narrower scope: it only fires when the failure is a real `AxiosError` (true for every HTTP-originated failure; not true for an arbitrary exception thrown by a user's own `getToken`/`refreshToken`, since there's no `AxiosError` to hand it).

**Consequences:** Both callback paths (`handleAuthRequest`, `handleResponseError`) now agree, and the public contract matches `@codeminity/request-core`'s own canonical `EventCallbacks` doc ("`onError`: called for every failed outcome, alongside `onEvent`") and `@codeminity/fetch`'s identical wording. Anyone who relied on the old either/or behavior — using `onError` as a catch-all specifically for errors `onEvent` didn't see — will now also see `onError` fire for classified HTTP failures; `onEvent`'s event name (or its absence, for a non-Axios auth exception) is still the reliable signal for telling the two cases apart.

---

## ADR-009: A broken `shouldRetry`/`getRetryDelay` fails safe, not loud

**Context:** `handleRetry` called the user-supplied `shouldRetry`/`getRetryDelay` with no try/catch. If either threw — a bug in the caller's own predicate — the exception replaced the original `AxiosError` all the way up the call stack, and `onEvent`/`onError` never fired for the real failure, since the code path that calls them (in `response-error.ts`) sits after the now-aborted `handleRetry` call.

**Decision:** `handleRetry` catches a throw from `shouldRetry` and treats it as "don't retry" (`false`), and catches a throw from `getRetryDelay` and falls back to `config.retryDelay ?? 0`, in both cases exactly as if the callback had returned normally with the safe default.

**Consequences:** A bug in a caller's own retry callback no longer masks the real failure or silently drops its lifecycle event — the original error still reaches `onEvent`/`onError` unchanged (see [ADR-008](#adr-008-onerror-always-fires-alongside-onevent)). The tradeoff: the callback's own exception is swallowed with no signal of its own, matching how `emitterCallback` already swallows a failing `onEvent`/`onError` — consistent with this package's existing house style rather than introducing new logging infrastructure for one callback family.

---

## Adding a New ADR

When proposing a decision that affects public behavior, configuration shape, or cross-instance state, add a new numbered entry above using the same **Context → Decision → Consequences** structure, and cross-link it from [CONTRIBUTING.md](./CONTRIBUTING.md) if it changes the contribution workflow.
