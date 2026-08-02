# @codeminity/fetch

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
