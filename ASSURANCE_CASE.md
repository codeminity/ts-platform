# Assurance Case

This document justifies why ts-platform's security requirements are met: the
threat model, the trust boundaries in the system, the secure design
principles applied, and how common implementation weaknesses are countered.
It complements [SECURITY.md](./SECURITY.md), which covers reporting and
scanning process rather than design rationale.

## 1. Threat Model

**What ts-platform is.** A monorepo of independently published npm
packages, each consumed as a dependency inside a caller's own application.

**Assets to protect.**

- Authentication credentials that pass through a package at
  runtime, supplied by the consuming application.
- The DOM a UI-rendering package produces — attacker-influenced input must
  never be interpreted as markup, styles, or script.
- The integrity of the published npm packages — a consumer trusts that what
  they install is what this repository actually built.
- The integrity of the release pipeline itself (who can cause a publish to
  happen, and under what permissions).

**Threats considered.**

| #   | Threat                                                                                                 | Where it's addressed                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| T1  | A compromised or malicious dependency injects code into a published package                            | §4 (minimal dependency surface), [SECURITY.md#continuous-scanning](./SECURITY.md#continuous-scanning) |
| T2  | The CI/CD pipeline is tricked into publishing an unauthorized or tampered version                      | §3 (least privilege, OIDC, no static publish token)                                                   |
| T3  | A PR's own (potentially malicious) build script runs with publish permission                           | §3 ("Dangerous workflow" fix — see `release.yml`)                                                     |
| T4  | Authentication credentials are leaked (logged, sent over an insecure channel, or exposed cross-origin) | §4 (no credential logging, no credential persistence, TLS verification never bypassed)                |
| T5  | Malformed or unexpected network responses cause a type-confusion bug or crash                          | §4 (allowlist-based classification)                                                                   |
| T6  | A supply-chain compromise of a third-party GitHub Action used in CI                                    | §4 (SHA-pinned actions)                                                                               |
| T7  | Untrusted or attacker-influenced input reaches a UI component and is interpreted as markup or style    | §4 (rendering-library default escaping, `unsafeCSS` restricted to internal style tokens)              |

## 2. Trust Boundaries

- **Consumer ↔ library.** The consuming application supplies config
  (including how to obtain or renew credentials) and, for UI packages, other
  configuration and content, all through a typed public API. This input is
  trusted at the type level but the library must never misuse or leak what
  it's given — see T4 — nor render it as unescaped markup/style — see T7.
- **Library ↔ remote HTTP server.** Response status codes, error names, and
  bodies are untrusted network input. A library only ever _classifies_ a
  narrow, known set of values from this boundary (status codes, error
  names) — see T5.
- **Library ↔ rendered DOM.** A UI-rendering package's own templating is the
  only path from a value to the page's DOM — see T7.
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
- **Defense in depth.** Four independent, non-overlapping automated
  mechanisms, each catching what the others don't: CodeQL and Socket.dev run
  on every push and pull request (static analysis; supply-chain risk in the
  dependency tree, respectively); OpenSSF Scorecard runs on push to `main`
  and weekly, not on pull requests, scoring the repo's own security posture;
  GitHub Dependabot alerts are continuous background monitoring against the
  vulnerability database, not a per-push check at all.
- **Separation of build and publish permission.** CI builds the packages
  without any publish credential. The release job, which does hold publish
  permission, never runs the build toolchain on source — it only downloads
  the artifact CI already produced (see `release.yml`'s "Dangerous
  workflow" comment for the specific risk this avoids).
- **No hidden global state.** Explicit control flow, deterministic
  execution, and no hidden mutable state, except the documented exceptions
  listed in [ARCHITECTURE.md#state-rule](./ARCHITECTURE.md#state-rule).
- **Minimal attack surface.** Every package depends only on the minimum its
  own job requires — nothing beyond what's fundamental to what it does
  (e.g. a third-party client it wraps, a rendering library, with a
  framework binding as an optional peer dependency rather than a hard
  dependency). The shared primitives package currently has zero runtime
  dependencies of its own.

## 4. Common Implementation Weaknesses Countered

- **Injection / arbitrary code execution.** No use of `eval`, `new
Function`, or any other dynamic code execution exists anywhere in the
  codebase (verified by repository-wide search, re-checked as part of this
  assessment).
- **Cross-site scripting / unsafe DOM injection.** A UI-rendering package's
  templating auto-escapes every dynamic value by default; the one
  intentional bypass (`unsafeCSS`, needed for CSS custom-property syntax the
  default template tag can't express) is used only with values sourced from
  a closed, compile-time-checked set of internal style-token keys — never a
  consumer-, attribute-, or network-supplied string (verified by
  repository-wide search of every `unsafeCSS` call site, re-checked as part
  of this assessment). No template in the codebase uses `unsafeHTML` or any
  other unescaped-markup primitive.
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
- **Unsafe concurrency.** Concurrent credential-renewal requests are
  coalesced through a dedicated queue instead of each caller independently
  racing to renew — covered by both example-based and
  property-based tests (see
  [DECISIONS.md#adr-008-property-based-testing-scope](./DECISIONS.md#adr-008-property-based-testing-scope)).

## Keeping This Current

This document should be revisited whenever a new package introduces
behavior not already covered by an asset, threat, or trust boundary above —
e.g. persisting data to disk, opening its own network listener or protocol,
executing an external process, or a new way of turning a value into
rendered output. A new package that's simply another instance of an
already-covered category (another HTTP adapter, another UI component) does
not, by itself, require an edit here — that's the point of describing
categories instead of naming packages.
