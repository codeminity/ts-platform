# @codeminity/request-core

## 0.10.0

### 🐛 Fixes

- Cancel the retry backoff delay immediately when the request is aborted mid-wait, instead of waiting out the full delay before the abort is observed. `delay()` now accepts an optional abort signal for this.
- Stop shipping test-file type declarations (`*.test.d.ts`) in the published npm tarball. `build:types` now uses a dedicated `tsconfig.build-types.json` that excludes `*.test.ts` — `typecheck` is unaffected and still checks test files as before. No runtime or type-surface change for consumers; the tarball is just smaller and no longer leaks the internal test-file layout.

## 0.9.0

### ✨ Features

- Add an optional `refreshTimeout` (milliseconds) to `AuthConfig`. Without it, a `refreshToken` that never settles hangs every request waiting on that refresh forever, with no error and no event. When set, `refreshToken()` races against a timer and fails the refresh (routing through the normal `onRefreshFail`/`onEvent`/`onError` path) if it doesn't settle in time. Unset by default — nothing changes unless you opt in. Available through `@codeminity/axios`'s and `@codeminity/fetch`'s `codeminity.refreshTimeout` too, since both inherit `AuthConfig`.

### 📚 Documentation

- Document the insecure-URL warning's process-wide dedup cache as an intentional, narrow exception to the no-global-state rule.
- Rewrite this package's README, ARCHITECTURE, CONTRIBUTING, and DECISIONS to match `@codeminity/axios`'s and `@codeminity/fetch`'s structure and depth, and fix several stale claims (a "planned" adapter that was already published, a broken relative license badge link).

### 🛠 Improvements

- `full-check` now installs and audits dependencies first, matching CI exactly; lower the audit severity gate from `high` to `moderate`.
- Fix a progress-log leak into test output in the local typecheck tooling.

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

## 0.8.0

### 🔒 Security

- Add `isInsecureUrl` and `warnIfInsecureUrl` as new public exports: a one-time-per-origin console warning when credentials (an `Authorization` header, or a cookie in `COOKIE` mode) are about to be sent over a non-HTTPS connection, excluding loopback addresses (`localhost`, `127.0.0.1`, `::1`).
- Every published release now gets a cryptographically signed git tag (via `gitsign`, keyless/OIDC-based — no static signing key) and an automatically created GitHub Release with install instructions and the relevant changelog excerpt.

### 🛠 Improvements

- Add `GOVERNANCE.md`, `CODE_OF_CONDUCT.md`, and `ASSURANCE_CASE.md` (threat model, trust boundaries, secure design rationale, and how common implementation weaknesses are countered).
- Add a Developer Certificate of Origin (DCO) requirement and a "Development Setup" section to `CONTRIBUTING.md`.
- Add a public `ROADMAP.md` and earn the [OpenSSF Best Practices](https://www.bestpractices.dev/projects/13923) badge.

## 0.7.1

### 🐛 Fixes

- Externalize `vitest` from the `./test-utils` build so it's no longer bundled into `dist/test-utils.js` — this had grown the file from ~1KB to 554KB and inlined `vitest`'s own transitive dependency `magic-string`, including its source URLs, into the published package.

### 🛠 Improvements

- Add `dependency-cruiser`-based architecture enforcement (no circular dependencies; a category's own `core` package may never depend on its sibling adapters) as an automated CI gate, replacing a documentation-only rule.
- Add Socket.dev supply-chain security scanning, both as a local `validate:socket` command and a CI gate.
- Add real-browser (Playwright) end-to-end testing and mutation testing (Stryker) covering all three packages, with mutation score at 100%.
- Bump `pnpm` to v11.18.0, `@types/node` to v26.1.2, and `github/codeql-action` to v4.37.4.

## 0.7.0

### 🚀 Features

- Add `dependencies` (a spy-friendly re-export of `handleRefreshToken` through a mutable object, for adapter test suites) and `emitterCallback`/`EventCallbacks<TEvent, TOutcome>` (generic "call `onEvent` then `onError`, swallowing callback errors") as new public exports — protocol-agnostic primitives previously duplicated identically inside `@codeminity/axios` and `@codeminity/fetch`.

### 🛠 Improvements

- Bump `turbo` to v2.10.7 and `globals` to v17.8.0.

## 0.6.0

### 📚 Documentation

- Add real TSDoc summaries to every public export (`AuthConfig`, `RefreshQueue`, `RetryConfig`, `TokenMode`, `TokenModeEnum`, `ErrorEventEnum`, `createRefreshQueue`, `delay`, `handleRefreshToken`) — previously each carried only a bare `@public` tag with no description.
- Broaden the documentation validator to scan every Markdown file in the repository (not just `README.md` and `docs/guides/*.md`), and derive the list of packages to type-check doc examples against dynamically from each package's `package.json` instead of a hardcoded list.
- Document the npm Trusted Publisher (OIDC) release authentication flow and provenance attestation in `SECURITY.md` and `CONTRIBUTING.md`.

### ⚙️ CI

- Enforce strict API Extractor validation: `verify:packages` no longer runs with `--local`, so a stale or drifted public API report now fails the build instead of being silently rewritten; all extractor messages (including `ae-forgotten-export`) are now treated as errors.

## 0.5.1

### 🛠 Improvements

- Patch high-severity transitive dependency advisories by updating `postcss` and `brace-expansion` through `pnpm.overrides`.
- Upgrade ESLint to v10.8.0.
- Update development tooling and GitHub Actions to their latest compatible versions.
- Upgrade the workspace to pnpm v11.17.0.

### 🧪 Testing

- Add coverage for the `./test-utils` public export.
- Improve coverage configuration by excluding the package entry file from coverage metrics.

### 📚 Documentation

- Fix incorrect `TokenModeEnum` usage in the README.
- Introduce automated validation for TypeScript code blocks in documentation.
- Update documentation examples to ensure all TypeScript snippets remain valid and synchronized with the current public API.

### ⚙️ CI

- Run documentation validation as part of the CI and release workflows to prevent invalid TypeScript examples from being merged.

## 0.5.0

### 🚀 Features

- Add a public `./test-utils` subpath export (`createAuthConfig`, `createRefreshQueue` mock) so adapter packages can share factory-based test fixtures instead of duplicating them, without pulling `vitest` into the main production bundle.

### 🛠 Improvements

- Restructure `src/` from type-based folders (`enums/`, `handlers/`, `interfaces/`, `types/`, `utils/`) to feature-based folders (`auth/`, `retry/`, `errors/`), with tests colocated next to their implementation.
- Fix `verify:packages` to resolve unreleased internal workspace dependencies from local tarballs instead of the npm registry, so a package can be verified before it's ever published.
- Add automated typecheck coverage for the workspace `scripts/` folder (previously never typechecked).
- Add a cross-platform (Ubuntu/Windows/macOS) CI test matrix.
- Patch a high-severity `brace-expansion` DoS advisory via `pnpm.overrides` (transitive dependency of `eslint`/`api-extractor`).
- Bump `pnpm`, `@changesets/cli`, and `globby`.

### 🐛 Fixes

- Fix a real type-safety bug in the package-verification tooling where a packed tarball's path could be `undefined` under `noUncheckedIndexedAccess`.
- Fix `createAuthConfig`'s mock to correctly allow explicit `undefined` overrides (simulating a missing dependency) under `exactOptionalPropertyTypes`.

### 🧪 Testing

- Add missing coverage for `TokenModeEnum` and `ErrorEventEnum`.
- Generalize the tarball-isolation regression test from 2 hardcoded packages to 100 arbitrarily-named, arbitrarily-located packages, proving `verify:packages` scales to any future package added under `packages/**`.

### 📚 Documentation

- Full documentation refresh: package structure diagrams, public API listings (previously missing exported enums/types), and the new `/test-utils` export are now documented across `README.md`, `ARCHITECTURE.md`, and `CONTRIBUTING.md`.
- Clarify this package is adapter-internal only and not meant for direct installation by application developers.

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

## 0.3.0

### 🛠 Improvements

- Update supported Node.js versions to `^22.13.0 || >=24.0.0`.
- Improve TypeScript project structure and shared package boundaries.
- Strengthen package publishing configuration and export validation.
- Improve CI quality gates with dependency auditing and coverage validation.
- Remove obsolete workspace release exclusions.

### 🧪 Testing

- Run code coverage as part of CI and release workflows.
- Improve API validation script with full type safety.
- Improve linting support for workspace scripts without relaxing project rules.

### 📚 Documentation

- Export public configuration types for a more discoverable API.
- Update Node.js version requirements.

## 0.2.0

### 🛠 Improvements

- Skip the refresh queue when refresh dependencies are not configured.
- Improve refresh lifecycle handling and recovery after failed refresh attempts.
- Prevent refresh failure callbacks from masking the original refresh error.
- Improve package validation by resolving package entry files from the actual package path.
- Standardize package metadata and improve build configuration.
- Add workspace-wide type checking support.
- Update supported Node.js versions.
- Upgrade project tooling (Turbo, ESLint, TypeScript ESLint, pnpm).

### 🧪 Testing

- Add Vitest coverage support.
- Add refresh queue concurrency and failure recovery tests.
- Improve test isolation for workspace environments.
- Add regression coverage for refresh lifecycle behavior.

### 📚 Documentation

- Add Changeset requirements to the contribution workflow.
- Improve project documentation and release guidance.

## 0.1.1

### 🛠 Improvements

- Update @types/node dependency
- Upgrade pnpm version used in CI and release workflows

## 0.1.0

### 🚀 Features

- Initial release of @codeminity/request-core
- Introduce core request orchestration primitives
- Add authentication lifecycle handling (token validation, refresh flow)
- Implement refresh queue for safe concurrent execution
- Add async utilities for deterministic execution flow control
- Establish strict public API surface

### 🧪 Testing

- Add full unit test coverage using Vitest
