# @codeminity/fetch

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
