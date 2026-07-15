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

---

## ADR-001: Thin adapter over Axios, not a new HTTP client

**Context:** Teams already have significant investment in Axios — code, interceptors, mental model, and third-party middleware. A brand-new HTTP client abstraction would require a full rewrite to adopt.

**Decision:** `@codeminity/axios` wraps Axios and preserves its API surface exactly (`axios.create()`, `.get/.post/.put/.patch/.delete`, interceptors), adding only an optional `codeminity` configuration key.

**Consequences:** Adoption cost is close to zero for existing Axios users. The tradeoff is that we inherit Axios's own API constraints and can't diverge from its request/response shape even where a cleaner design might otherwise be possible.

---

## ADR-002: Lifecycle logic lives in `@codeminity/request-core`, not in this package

**Context:** Auth lifecycle, refresh coordination, and retry orchestration are transport-independent concerns. If they were implemented directly inside the Axios adapter, they couldn't be reused if the ecosystem later added a `fetch` or `undici` adapter.

**Decision:** All non-Axios-specific logic is implemented in `@codeminity/request-core`, which has no dependency on Axios. `@codeminity/axios` is limited to interceptor wiring and configuration forwarding.

**Consequences:** Enables future adapters to share the same tested lifecycle engine. Adds one extra package boundary to reason about, and any change to lifecycle behavior requires touching two packages (or at minimum, understanding which one owns the change) — see [ARCHITECTURE.md](./ARCHITECTURE.md).

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

## Adding a New ADR

When proposing a decision that affects public behavior, configuration shape, or cross-instance state, add a new numbered entry above using the same **Context → Decision → Consequences** structure, and cross-link it from [CONTRIBUTING.md](./CONTRIBUTING.md) if it changes the contribution workflow.
