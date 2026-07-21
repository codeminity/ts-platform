# @codeminity/axios

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
