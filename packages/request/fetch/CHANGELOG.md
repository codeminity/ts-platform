# @codeminity/fetch

## 0.5.0

### 🚀 Features

- `onRefreshFail` now receives a second argument, `retry: () => Promise<void>`, letting you retry a failed `refreshToken` call on transient failures without any new config. Call and `await` (or `return`) `retry()` to re-run `refreshToken` (racing the same `refreshTimeout`, if configured) — it resolves or rejects based on that attempt's real outcome. Not calling `retry()` behaves exactly as before. Fully backward compatible: an existing `onRefreshFail: (error) => void` implementation is unaffected.

### Dependency Updates

- Updated dependencies [11580cf]
  - @codeminity/request-core@0.13.0

## 0.4.0

### 🚀 Features

- Add an opt-in `retryJitter` config (`'none'` | `'full'` | `'equal'`, default `'none'`) that randomizes the default retry delay to avoid many clients retrying in lockstep after the same failure ("thundering herd"). Only affects the default delay computation — a configured `getRetryDelay` remains a full override, unaffected by jitter.

### Dependency Updates

- Updated dependencies [83b6452]
  - @codeminity/request-core@0.12.0

## 0.3.0

### 🚀 Features

- Automatically honor a `Retry-After` response header when retrying (supports both the numeric-seconds and HTTP-date forms), boosting the delay whenever it asks for longer than the configured `retryDelay` would otherwise wait, capped at 5 minutes. No configuration needed — a configured `getRetryDelay` still fully overrides this, same as any other backoff customization.

### 🔒 Security

- Bump `nanoid` to a patched version (CVE-2026-67213, custom generators looping indefinitely when size is zero) via a `pnpm-workspace.yaml` override.

### ⚙️ CI

- Pin `github/codeql-action` to its real commit SHA instead of the annotated tag object's SHA — still resolved correctly either way, but non-standard pinning.

### Dependency Updates

- Updated dependencies [5047387]
  - @codeminity/request-core@0.11.0

## 0.2.5

### Dependency Updates

- Updated dependencies [30d49f5]
- Updated dependencies [4ca1759]
  - @codeminity/request-core@0.10.1

## 0.2.4

### 🐛 Fixes

- Fix the insecure-URL warning never firing for a relative URL/path — the most common usage pattern in a browser SPA (`document.baseURI` was previously never resolved against, so `new URL('/orders')` threw and the check silently no-opped). Relative URLs now resolve against `document.baseURI` (in a browser) before being checked, matching how the request is actually dispatched.
- Skip auth/token-refresh entirely on a retry attempt whose signal is already aborted, instead of spending a real `refreshToken()` call on a request that's already cancelled. This closes the remaining gap in the retry-backoff abort-cancellation fix: aborting mid-backoff now also avoids the wasted refresh work on the retry attempt that follows.

### 🔒 Security

- Close a fork-PR `workflow_run` spoofing gap in the release workflow ("pwn request" pattern) — the job now also checks the triggering event was a real `push`, not just that the run succeeded.
- Bump `js-yaml` to patched versions (CVE-2026-59870, a quadratic-CPU `!!omap` resolution) via `pnpm-workspace.yaml` overrides.

### 📚 Documentation

- Stop logging full outcome-error objects in event/authentication doc examples — normalized to log a message string instead, consistent with the guides' own stated logging pitfalls.

### ⚙️ CI

- Declare `tsconfig.base.json` as a Turborepo global dependency, so a shared-config change correctly invalidates every package's build cache instead of serving a stale one.

## 0.2.3

### 🐛 Fixes

- Cancel the retry backoff delay immediately when the request is aborted mid-wait, instead of waiting out the full delay before the abort is observed. `handleRetry` now forwards the request's own abort signal to `request-core`'s `delay()`.
- Stop shipping test-file type declarations (`*.test.d.ts`) in the published npm tarball. No runtime or type-surface change for consumers; the tarball is just smaller and no longer leaks the internal test-file layout.
- Fix `shouldRetry` silently disabling the retry cap forever when `retries` resolves to `NaN` (reachable through ordinary type-correct arithmetic, e.g. a division by zero — no type-bypass needed). `attempt > NaN` is always `false` in JavaScript, so the retry budget never appeared exhausted. A `NaN` `retries` is now treated the same as an unconfigured one: zero, meaning "don't retry."

### Dependency Updates

- Updated dependencies [c10cb59]
- Updated dependencies [fe5fe3f]
  - @codeminity/request-core@0.10.0

## 0.2.2

### 🐛 Fixes

- Fix `handleRetry` propagating an exception thrown by a caller's own `shouldRetry`/`getRetryDelay`, which replaced the original failure and skipped its `onEvent`/`onError` telemetry entirely. A broken `shouldRetry` now fails safe (treated as "don't retry"); a broken `getRetryDelay` now falls back to `retryDelay`/`0`, exactly as if either had returned its safe default.

### 🛠 Improvements

- `full-check` now installs and audits dependencies first, matching CI exactly; lower the audit severity gate from `high` to `moderate`.

### Dependency Updates

- Updated dependencies
  - @codeminity/request-core@0.9.0

## 0.2.1

### 🐛 Fixes

- Fix relative imports in published type declarations missing explicit `.js` extensions, which silently broke type resolution for consumers using `moduleResolution: "NodeNext"`/`"node16"` (the correct setting for a real Node.js app). A new `pnpm run validate:node-resolution` check (CI-gated) prevents this from regressing.
- Fix the automatic git-tag/GitHub-Release step after a publish incorrectly treating a tag as already existing (it checked a local-only ref instead of the remote), which silently skipped creating and pushing the real signed tag; added a manual `workflow_dispatch` recovery path as a stopgap.

### 🛠 Improvements

- Add `pnpm run full-check`, a single command that runs every CI check locally (build, lint, format, typecheck, test, dependency architecture, API/docs validation, package verification, bundle size, mutation testing, browser e2e) without stopping at the first failure.
- Add `pnpm run clean`, an explicit allowlist-based reset to a fresh-clone state, and enforce Prettier formatting as a real CI gate.
- Add a benchmark suite (Vitest's built-in `bench()`) covering every performance-sensitive hot path across all three packages.
- Add bundle-size monitoring (`size-limit`) as a CI gate.
- Bump `turbo` to v2.10.8 and `tsx` to v4.23.4.

### 🔒 Security

- Fix OpenSSF Scorecard `Token-Permissions` and `Dangerous-Workflow` alerts on `release.yml`.
- Make the Socket.dev security scan retry on transient report-fetch failures instead of failing CI spuriously.

### 📚 Documentation

- Add a second maintainer for repository continuity.

### Dependency Updates

- Updated dependencies [39c39e6]
  - @codeminity/request-core@0.8.1

## 0.2.0

### 🔒 Security

- Warn once per origin when an `Authorization` header or a `COOKIE`-mode credential is about to be sent over a non-HTTPS connection, excluding loopback addresses (`localhost`, `127.0.0.1`, `::1`). Uses `@codeminity/request-core`'s new `warnIfInsecureUrl`.
- Every published release now gets a cryptographically signed git tag (via `gitsign`, keyless/OIDC-based — no static signing key) and an automatically created GitHub Release with install instructions and the relevant changelog excerpt.

### 🛠 Improvements

- Add `GOVERNANCE.md`, `CODE_OF_CONDUCT.md`, and `ASSURANCE_CASE.md` (threat model, trust boundaries, secure design rationale, and how common implementation weaknesses are countered) at the repository root.
- Add a Developer Certificate of Origin (DCO) requirement and a "Development Setup" section to `CONTRIBUTING.md`.
- Add a public `ROADMAP.md` and earn the [OpenSSF Best Practices](https://www.bestpractices.dev/projects/13923) badge.

### Patch Changes

- Updated dependencies
  - @codeminity/request-core@0.8.0

## 0.1.1

### 🛠 Improvements

- Add `dependency-cruiser`-based architecture enforcement, Socket.dev supply-chain scanning, and a real-browser (Playwright) end-to-end test covering this package's `COOKIE` auth mode cross-origin, in a real browser, against the actual built package.
- Bump `pnpm` to v11.18.0, `@types/node` to v26.1.2, and `github/codeql-action` to v4.37.4.

### Patch Changes

- Updated dependencies
  - @codeminity/request-core@0.7.1

## 0.1.0

### Minor Changes

- Initial release of `@codeminity/fetch`: a native Fetch adapter over `@codeminity/request-core`, providing authentication lifecycle handling, refresh-token coordination, retry orchestration, and request lifecycle events — with the exact same call signature and resolve/throw contract as native `fetch` itself (no `.get`/`.post` methods, no throwing on non-2xx responses).

  Proves `@codeminity/request-core`'s transport-agnostic design generalizes beyond Axios: this adapter shares zero transport-specific code with `@codeminity/axios`, only the underlying protocol-agnostic primitives (`handleRefreshToken`, `createRefreshQueue`, `delay`, `dependencies`, `emitterCallback`, `TokenModeEnum`, `AuthConfig`, `RefreshQueue`).

### Patch Changes

- Updated dependencies
  - @codeminity/request-core@0.7.0
