# Assurance Case

This document justifies why ts-platform's security requirements are met: the
threat model, the trust boundaries in the system, the secure design
principles applied, and how common implementation weaknesses are countered.
It complements [SECURITY.md](./SECURITY.md), which covers reporting and
scanning process rather than design rationale.

## 1. Threat Model

**What ts-platform is.** A set of runtime infrastructure primitives
(authentication lifecycle, token refresh coordination, retry orchestration,
request lifecycle events) consumed as npm dependencies inside a caller's own
application, plus two adapters (`@codeminity/axios`, `@codeminity/fetch`)
built on top of it.

**Assets to protect.**

- Authentication credentials (tokens) that pass through the library at
  runtime, supplied by the consuming application.
- The integrity of the published npm packages — a consumer trusts that what
  they install is what this repository actually built.
- The integrity of the release pipeline itself (who can cause a publish to
  happen, and under what permissions).

**Threats considered.**

| #   | Threat                                                                                            | Where it's addressed                                                                                  |
| --- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| T1  | A compromised or malicious dependency injects code into a published package                       | §4 (minimal dependency surface), [SECURITY.md#continuous-scanning](./SECURITY.md#continuous-scanning) |
| T2  | The CI/CD pipeline is tricked into publishing an unauthorized or tampered version                 | §3 (least privilege, OIDC, no static publish token)                                                   |
| T3  | A PR's own (potentially malicious) build script runs with publish permission                      | §3 ("Dangerous workflow" fix — see `release.yml`)                                                     |
| T4  | Authentication tokens are leaked (logged, sent over an insecure channel, or exposed cross-origin) | §4 (no credential logging, no credential persistence, TLS verification never bypassed)                |
| T5  | Malformed or unexpected network responses cause a type-confusion bug or crash                     | §4 (allowlist-based classification)                                                                   |
| T6  | A supply-chain compromise of a third-party GitHub Action used in CI                               | §4 (SHA-pinned actions)                                                                               |

## 2. Trust Boundaries

- **Consumer ↔ library.** The consuming application supplies config
  (including how to obtain/refresh a token) through a typed public API. This
  input is trusted at the type level but the library must never misuse or
  leak what it's given — see T4.
- **Library ↔ remote HTTP server.** Response status codes, error names, and
  bodies are untrusted network input. The library only ever _classifies_ a
  narrow, known set of values from this boundary (status codes, error
  names) — see T5.
- **PR author ↔ CI.** A pull request's code must never run with publish
  permission — see T3, and `release.yml`'s comment explaining the specific
  fix (downloading CI's pre-built artifact instead of rebuilding under
  elevated permissions).
- **Maintainer ↔ npm registry.** Publish authority is scoped to this exact
  repository and workflow file via npm Trusted Publisher (OIDC) — there is
  no static credential that could leak or be reused elsewhere.
- **CI runner ↔ third-party GitHub Actions.** Every action referenced in any
  workflow is pinned to a full commit SHA, not a mutable tag — see T6.

## 3. Secure Design Principles Applied

- **Least privilege.** Publishing uses short-lived OIDC tokens instead of a
  long-lived `NPM_TOKEN` (see
  [SECURITY.md#release--supply-chain-security](./SECURITY.md#release--supply-chain-security)).
  Workflow permissions are scoped per-job, not repo-wide (e.g.
  `security-events: write` only on the CodeQL analysis job; `contents:
write` only on the release job, only to push the tag it just published).
- **Fail-safe defaults.** Untrusted values from the network (HTTP status
  codes, error names) are matched against an exhaustive known set with an
  explicit `unknown` fallback for anything else — nothing is silently
  assumed safe.
- **Defense in depth.** Four independent, non-overlapping automated checks
  run on every change: CodeQL (static analysis), Socket.dev (supply-chain
  risk), OpenSSF Scorecard (repo security posture), and GitHub Dependabot
  alerts (known-vulnerability monitoring).
- **Separation of build and publish permission.** CI builds the packages
  without any publish credential. The release job, which does hold publish
  permission, never runs the build toolchain on source — it only downloads
  the artifact CI already produced (see `release.yml`'s "Dangerous
  workflow" comment for the specific risk this avoids).
- **No hidden global state.** Explicit control flow, deterministic
  execution, and no hidden mutable state, with one documented exception (see
  [ARCHITECTURE.md#state-rule](./ARCHITECTURE.md#state-rule)).
- **Minimal attack surface.** `@codeminity/request-core` has zero runtime
  dependencies. `@codeminity/fetch` depends only on `request-core`.
  `@codeminity/axios` depends only on `request-core` and `axios` itself —
  nothing beyond what each adapter fundamentally requires.

## 4. Common Implementation Weaknesses Countered

- **Injection / arbitrary code execution.** No use of `eval`, `new
Function`, or any other dynamic code execution exists anywhere in the
  codebase (verified by repository-wide search, re-checked as part of this
  assessment).
- **Prototype pollution.** No direct prototype manipulation (`__proto__`,
  `prototype[...]` assignment) exists anywhere in the codebase (same
  search).
- **Type confusion.** TypeScript `strict` mode plus
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` catch entire
  classes of type-confusion defects at compile time, enforced in CI via
  `pnpm typecheck`.
- **Credential leakage.** Tokens are never written to a log statement
  anywhere in the codebase (verified by search), never persisted to disk,
  and held only in memory for the lifetime of the request that needs them.
- **Insecure TLS defaults.** No code anywhere sets `rejectUnauthorized:
false`, `NODE_TLS_REJECT_UNAUTHORIZED`, or any other certificate
  verification bypass — TLS behavior is always the platform default
  (verified by search).
- **Supply-chain compromise.** Every GitHub Action is pinned to a full
  commit SHA (not a mutable tag), dependencies are continuously scanned
  (Socket.dev, Dependabot alerts), and every published package carries a
  signed npm provenance attestation back to the exact commit and workflow
  run that built it.
- **Unsafe concurrency.** Concurrent token-refresh requests are coalesced
  through a dedicated refresh queue (`createRefreshQueue`) instead of each
  caller independently racing to refresh — covered by both example-based and
  property-based tests (see
  [DECISIONS.md#property-based-testing-scope](./DECISIONS.md#property-based-testing-scope)).

## Keeping This Current

This document should be revisited whenever a new package is added to the
workspace, a new trust boundary is introduced (e.g. a package that persists
data or handles its own network protocol), or a threat in §1 is found to be
inadequately addressed.
