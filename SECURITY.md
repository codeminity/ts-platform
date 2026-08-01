# Security Policy

## Supported Versions

Only the latest release of each package in `ts-platform` is supported.

| Package Version | Supported |
| --------------- | --------- |
| latest          | ✅        |
| < latest        | ❌        |

---

## Reporting a Vulnerability

🚨 **Do NOT open public issues for security vulnerabilities.**

Please report security issues privately via:

- Email: security@codeminity.dev

We aim to respond within **48–72 hours**.

---

## Scope

ts-platform provides low-level infrastructure primitives for the Codeminity ecosystem.

Security-sensitive areas include:

- concurrency primitives (refresh queue / async coordination)
- retry orchestration
- authentication/token handling

This repository does **not** handle:

- payment processing
- user authentication systems
- direct network services (except via adapters)

---

## Security Principles

This project is designed with:

- no hidden side effects
- deterministic async execution
- minimal external dependencies
- explicit control flow
- no global mutable state, except one documented case in `@codeminity/axios`'s default export (shared with plain Axios's own singleton for API parity) — see [ARCHITECTURE.md](./ARCHITECTURE.md#state-rule)

---

## Disclosure Policy

We follow responsible disclosure.  
Security fixes will be released as soon as patches are available.

---

## Release & Supply Chain Security

Packages are published to npm exclusively via [`.github/workflows/release.yml`](./.github/workflows/release.yml), triggered on push to `main`. There is no manual `npm publish` process and no long-lived npm token stored anywhere in this repository or its secrets.

- **npm Trusted Publisher (OIDC):** each package is configured on npmjs.com to trust this specific repository and workflow file. The workflow requests a short-lived OpenID Connect token from GitHub's identity provider (`permissions: id-token: write`) and npm exchanges it for a one-time publish credential — there is no static `NPM_TOKEN` secret to leak, rotate, or scope incorrectly. If the release job ever needs an `NPM_TOKEN` secret to work, that's a sign the trusted publisher configuration has regressed, not a gap to patch by adding one back.
- **Provenance:** every publish sets `NPM_CONFIG_PROVENANCE=true`, so each package version carries a signed attestation linking the published tarball to the exact commit, workflow run, and source repository that built it. Consumers can verify this via `npm audit signatures` or the "Provenance" badge on the npm package page.
- **What this buys you as a consumer:** installing `@codeminity/*` from npm gives you a package that provably came from a GitHub Actions run in this repository, on `main`, with no human able to publish a version by hand using a leaked or misused token.

---

## Continuous Scanning

- **Socket.dev:** every push and pull request is scanned for supply-chain risk in the dependency tree (`pnpm run validate:socket` locally, gated in CI) — install scripts, obfuscated code, typosquatting, and similar signals on every direct and transitive dependency.
- **CodeQL:** static analysis for common vulnerability classes runs on every push/PR and on a weekly schedule, independent of the Socket.dev dependency-focused scan.
- **Dependabot:** checks weekly for outdated/vulnerable dependencies (both npm packages and GitHub Actions) and opens a PR per update — grouped by minor/patch to reduce noise, security updates surfaced individually. PRs go through the same CI gates as any other PR; nothing merges automatically.
