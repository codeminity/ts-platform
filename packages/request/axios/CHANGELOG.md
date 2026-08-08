# @codeminity/axios

## 0.10.0

### 🚀 Features

- Automatically honor a `Retry-After` response header when retrying (supports both the numeric-seconds and HTTP-date forms), boosting the delay whenever it asks for longer than the configured `retryDelay` would otherwise wait, capped at 5 minutes. No configuration needed — a configured `getRetryDelay` still fully overrides this, same as any other backoff customization.

### 🔒 Security

- Bump `nanoid` to a patched version (CVE-2026-67213, custom generators looping indefinitely when size is zero) via a `pnpm-workspace.yaml` override.

### ⚙️ CI

- Pin `github/codeql-action` and `chainguard-dev/actions` to their real commit SHAs instead of the annotated tag object's SHA — still resolved correctly either way, but non-standard pinning.

### Dependency Updates

- Updated dependencies [5047387]
  - @codeminity/request-core@0.11.0

## 0.9.3

### Dependency Updates

- Updated dependencies [30d49f5]
- Updated dependencies [4ca1759]
  - @codeminity/request-core@0.10.1

## 0.9.2

### 🐛 Fixes

- Fix a throwing `onEvent` callback suppressing `onError` (and vice versa) during an auth/token-refresh failure. Both callbacks now fail safe independently, matching how every other failure path in this package already behaves.
- Fix the insecure-URL warning never firing for a relative URL/path — the most common usage pattern in a browser SPA (`baseURL`/`document.baseURI` was previously never resolved against, so `new URL('/orders')` threw and the check silently no-opped). Relative URLs now resolve against the configured `baseURL` before being checked, matching how the request is actually dispatched.
- Skip auth/token-refresh entirely on a retry attempt whose signal is already aborted, instead of spending a real `refreshToken()` call on a request that's already cancelled. This closes the remaining gap in the retry-backoff abort-cancellation fix: aborting mid-backoff now also avoids the wasted refresh work on the retry attempt that follows.

### 🔒 Security

- Close a fork-PR `workflow_run` spoofing gap in the release workflow ("pwn request" pattern) — the job now also checks the triggering event was a real `push`, not just that the run succeeded.
- Bump `js-yaml` to patched versions (CVE-2026-59870, a quadratic-CPU `!!omap` resolution) via `pnpm-workspace.yaml` overrides.

### 📚 Documentation

- Stop logging full `error`/auth-outcome objects in event/authentication doc examples — several examples logged the raw error, which can carry the live `Authorization` header; examples now log `error.message` (or the classified status) instead.

### 🧪 Testing

- Give `configuredAxios`'s `Object.assign` composition (previously untested glue code) real test coverage, proving `create` is wired correctly and the auth interceptor actually attaches.

### ⚙️ CI

- Declare `tsconfig.base.json` as a Turborepo global dependency, so a shared-config change correctly invalidates every package's build cache instead of serving a stale one.

## 0.9.1

### 🐛 Fixes

- Cancel the retry backoff delay immediately when the request is aborted mid-wait, instead of waiting out the full delay before the abort is observed. `handleRetry` now forwards the request's own abort signal to `request-core`'s `delay()`.
- Stop shipping test-file type declarations (`*.test.d.ts`) in the published npm tarball. No runtime or type-surface change for consumers; the tarball is just smaller and no longer leaks the internal test-file layout.
- Fix `shouldRetry` silently disabling the retry cap forever when `retries` resolves to `NaN` (reachable through ordinary type-correct arithmetic, e.g. a division by zero — no type-bypass needed). `attempt > NaN` is always `false` in JavaScript, so the retry budget never appeared exhausted. A `NaN` `retries` is now treated the same as an unconfigured one: zero, meaning "don't retry."

### Dependency Updates

- Updated dependencies [c10cb59]
- Updated dependencies [fe5fe3f]
  - @codeminity/request-core@0.10.0

## 0.9.0

### 🐛 Fixes

- `onError` now always fires alongside `onEvent` for every failed outcome, including classified HTTP failures — matching `@codeminity/fetch`'s and `@codeminity/request-core`'s existing contract. Previously, the auth path (refresh/token failures) treated `onEvent`/`onError` as mutually exclusive while the response-error path always fired both, silently disagreeing with itself. If you relied on `onError` only firing for non-Axios exceptions, it will now also fire for classified `AxiosError` failures — use the presence of an `onEvent` call (or its event name) to distinguish the two cases.
- Fix `handleRetry` propagating an exception thrown by a caller's own `shouldRetry`/`getRetryDelay`, which replaced the original failure and skipped its `onEvent`/`onError` telemetry entirely. A broken `shouldRetry` now fails safe (treated as "don't retry"); a broken `getRetryDelay` now falls back to `retryDelay`/`0`, exactly as if either had returned its safe default.

### 🔒 Security

- Fix the README's `onEvent`/`onError` examples logging the full error object, which carries the live `Authorization` header via `error.config.headers` — now logs only the message/status.

### 📚 Documentation

- Add COMPATIBILITY.md.

### 🛠 Improvements

- `full-check` now installs and audits dependencies first, matching CI exactly; lower the audit severity gate from `high` to `moderate`.

### Dependency Updates

- Updated dependencies
  - @codeminity/request-core@0.9.0

## 0.8.1

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

## 0.8.0

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

## 0.7.1

### 🛠 Improvements

- Simplify HTTP status-to-event mapping: remove a redundant guard that overlapped with the `switch` statement's own `default` case — internal refactor only, no behavior change.
- Add `dependency-cruiser`-based architecture enforcement, Socket.dev supply-chain scanning, and a real-browser (Playwright) end-to-end test covering this package's `COOKIE` auth mode cross-origin, in a real browser, against the actual built package.
- Bump `pnpm` to v11.18.0, `@types/node` to v26.1.2, and `github/codeql-action` to v4.37.4.

### Patch Changes

- Updated dependencies
  - @codeminity/request-core@0.7.1

## 0.7.0

### 🛠 Improvements

- Use `@codeminity/request-core`'s new `dependencies` and `emitterCallback` exports instead of maintaining local copies — internal refactor only, no behavior or public API change.
- Bump `turbo` to v2.10.7 and `globals` to v17.8.0.

### Patch Changes

- Updated dependencies
  - @codeminity/request-core@0.7.0

## 0.6.0

### 🚀 Features

- Export `ErrorEvent` (type) and `ErrorEventEnum` (const) from the package root, so consumers can reference and compare against the lifecycle event identifiers passed to `onEvent` instead of relying on an unexported type or hardcoded string literals.

### 🐛 Fixes

- Make `skipAuth` take precedence over `tokenMode: COOKIE`: a per-request `codeminity: { skipAuth: true }` override was previously ignored when the instance used cookie mode, so `withCredentials` was still attached even though authentication was meant to be skipped entirely. See [ADR-007](./DECISIONS.md#adr-007-skipauth-takes-precedence-over-tokenmode-cookie).
- Resolve two leaked internal exports (`ae-forgotten-export`) that were sitting unresolved in the public API report: the default export's inferred type referenced the internal `getAxiosInstance` function by name, and `CallbackConfig.onEvent` was typed with a value (`ErrorEvent`) that was never exported.

### 📚 Documentation

- Add real TSDoc summaries to every public export (`CallbackConfig`, `Config`, `create`, `RequestConfig`, `RetryConfig`) — previously each carried only a bare `@public` tag with no description.
- Broaden the documentation validator to scan every Markdown file in the repository (not just `README.md` and `docs/guides/*.md`), and derive the list of packages to type-check doc examples against dynamically instead of a hardcoded list.
- Document the npm Trusted Publisher (OIDC) release authentication flow and provenance attestation in `SECURITY.md` and `CONTRIBUTING.md`.

### ⚙️ CI

- Enforce strict API Extractor validation: `verify:packages` no longer runs with `--local`, so a stale or drifted public API report now fails the build instead of being silently rewritten; all extractor messages (including `ae-forgotten-export`) are now treated as errors.

### Patch Changes

- Updated dependencies
  - @codeminity/request-core@0.6.0

## 0.5.1

### 🛠 Improvements

- Patch high-severity transitive dependency advisories by updating `postcss` and `brace-expansion` through `pnpm.overrides`.
- Upgrade ESLint to v10.8.0.
- Update development tooling and GitHub Actions to their latest compatible versions.
- pgrade the workspace to pnpm v11.17.0.

### 🧪 Testing

- Add coverage for the `./test-utils` public export.
- Improve coverage configuration by excluding the package entry file from coverage metrics.

### 📚 Documentation

- Fix incorrect `TokenModeEnum` usage in the README.
- Introduce automated validation for TypeScript code blocks in documentation.
- Refresh documentation examples across authentication, retry, events, advanced patterns, and README guides to ensure all TypeScript snippets remain valid and aligned with the current public API.

### ⚙️ CI

- Run documentation validation as part of the CI and release workflows to automatically validate all TypeScript code examples.

### Patch Changes

- Updated dependencies
  - @codeminity/request-core@0.5.1

## 0.5.0

### 🛠 Improvements

- Restructure `src/` from type-based folders (`handlers/`, `interceptors/`, `factories/`, `utils/`, `enum/`, `types/`, `emit/`, `mapper/`, `interfaces/`) to feature-based folders (`auth/`, `retry/`, `errors/`, `shared/`), with tests colocated next to their implementation.
- Switch to `@codeminity/request-core`'s new `./test-utils` export instead of maintaining local duplicates of `createAuthConfig`/`createRefreshQueue`.
- Add automated typecheck coverage for the workspace `scripts/` folder (previously never typechecked).
- Add a cross-platform (Ubuntu/Windows/macOS) CI test matrix.
- Patch a high-severity `brace-expansion` DoS advisory via `pnpm.overrides` (transitive dependency of `eslint`/`api-extractor`).
- Bump `pnpm`, `@changesets/cli`, and `globby`.

### 🐛 Fixes

- Fix `exactOptionalPropertyTypes` violations in test fixtures (`response-error.test.ts`, `error-to-event.test.ts`, `should-retry.test.ts`) surfaced by the new stricter workspace typecheck — these were previously invisible because test files weren't part of any typechecked TypeScript project.

### 🧪 Testing

- Generalize the `verify:packages` tarball-isolation regression test from 2 hardcoded packages to 100 arbitrarily-named, arbitrarily-located packages.

### 📚 Documentation

- Full documentation refresh: package structure diagrams across `README.md`, `ARCHITECTURE.md`, and `CONTRIBUTING.md` now match the current feature-based layout.
- Document the one intentional exception to "no global mutable state" (the default export sharing Axios's own global singleton) in `ARCHITECTURE.md`'s Instance Isolation section.

### Patch Changes

- Updated dependencies
  - @codeminity/request-core@0.5.0

## 0.4.0

### 🛠 Improvements

- Add automated package verification workflow for all workspace packages.
- Add package discovery support to verify packages dynamically without package-specific configuration.
- Add publint validation to ensure published packages follow npm package best practices.
- Add API Extractor validation to track and validate public package APIs.
- Add tarball verification by packing packages, installing generated artifacts, and validating runtime imports.
- Improve CI and release workflows with package verification gates.
- Improve package boundary validation and publishing confidence.

### 🧪 Testing

- Add verification tests for package discovery, package validation, publint execution, and API validation.
- Improve test coverage enforcement with CI coverage thresholds.
- Add deterministic mocks and isolated verification test flows.
- Validate all workspace packages through automated verification commands.

### 📚 Documentation

- Add package verification guidance to contributing documentation.
- Clarify monorepo package dependency model and public API boundaries.
- Document verification requirements for publishing packages.

### Patch Changes

- Updated dependencies
  - @codeminity/request-core@0.4.0

## 0.3.0

### 🚀 Features

- Export public configuration types from the package root:
  - `Config`
  - `RequestConfig`
  - `RetryConfig`
  - `CallbackConfig`
  - `AuthConfig`

### 🛠 Improvements

- Update supported Node.js versions to `^22.13.0 || >=24.0.0`.
- Improve TypeScript package boundaries and public API surface.
- Strengthen package publishing configuration and export validation.
- Improve CI quality gates with dependency auditing and coverage validation.

### 🧪 Testing

- Run code coverage as part of CI and release workflows.
- Improve API validation script with full type safety.
- Improve linting support for workspace scripts without relaxing project rules.

### 📚 Documentation

- Update Node.js version requirements.

### Patch Changes

- Updated dependencies
  - @codeminity/request-core@0.3.0

## 0.2.0

### 🛠 Improvements

- Skip token refresh entirely when authentication is disabled or no token provider is configured.
- Use `ErrorEventEnum` consistently for emitted lifecycle events.
- Prevent error event callback failures from breaking request error handling flows.
- Fix an infinite recursion issue when using `create()`.
- Scope the refresh queue per Axios instance instead of sharing a global queue.
- Make `shouldRetry` a complete override for retry decisions.
- Merge global retry configuration with per-request retry options.
- Update supported Node.js versions.
- Improve TypeScript configuration and package type boundaries.
- Upgrade project tooling (Turbo, ESLint, TypeScript ESLint, pnpm).

### 🧪 Testing

- Add integration tests covering Axios instance creation.
- Add concurrent token refresh integration coverage.
- Add authentication refresh failure recovery tests.
- Add error event callback isolation tests.
- Improve workspace test isolation.
- Add Vitest coverage support.

### 📚 Documentation

- Expand Axios documentation.
- Add retry architecture decision records (ADRs).
- Improve contribution guidelines with Changeset requirements.

### Patch Changes

- Updated dependencies
  - @codeminity/request-core@0.2.0

## 0.1.1

### 🛠 Improvements

- Update README badge links for the published `@codeminity/axios` package.
- Fix scoped npm badge resolution for package metadata display.

## 0.1.0

### 🚀 Features

- Initial release of @codeminity/axios
- Introduce a production-ready Axios adapter powered by @codeminity/request-core
- Extend Axios with Codeminity lifecycle configuration through the `codeminity` option
- Add TypeScript module augmentation for Axios instance and request configuration
- Integrate Axios interceptors with request lifecycle orchestration
- Add authentication lifecycle support with token retrieval and refresh coordination
- Add concurrent refresh protection through request-core integration
- Add configurable retry orchestration with custom retry strategies
- Add request lifecycle event handling and error callbacks
- Preserve the native Axios API while adding infrastructure-level request capabilities

### 🧪 Testing

- Add full unit test coverage using Vitest
- Cover Axios integration, configuration handling, and lifecycle behavior

### 📚 Documentation

- Add complete package documentation
- Document authentication, retry, events, architecture, and migration patterns
- Add usage examples and API reference
