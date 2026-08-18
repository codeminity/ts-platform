# Security Policy

See also [ASSURANCE_CASE.md](./ASSURANCE_CASE.md) for the threat model,
trust boundaries, and the reasoning behind the security decisions
summarized in this document.

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
  - **Exception — a brand new package's first publish:** npm's Trusted Publisher can only be configured for a package that already exists on npmjs.com (confirmed unresolved upstream limitation, [npm/cli#8544](https://github.com/npm/cli/issues/8544); PyPI supports this, npm does not). A package's very first version therefore cannot be published via OIDC — there is nothing yet to configure the trust relationship against. When this applies, a short-lived, single-purpose `NPM_TOKEN` secret is added just long enough for that one bootstrap publish, then deleted immediately afterward once Trusted Publisher is configured for the now-existing package — no `NPM_TOKEN` secret exists in this repo outside that brief window.
- **Provenance:** every publish sets `NPM_CONFIG_PROVENANCE=true`, so each package version carries a signed attestation linking the published tarball to the exact commit, workflow run, and source repository that built it. Consumers can verify this via `npm audit signatures` or the "Provenance" badge on the npm package page.
- **What this buys you as a consumer:** installing `@codeminity/*` from npm gives you a package that provably came from a GitHub Actions run in this repository, on `main`, with no human able to publish a version by hand using a leaked or misused token.
- **Signed git tags:** every published version's git tag (`<package>@<version>`) is cryptographically signed via [gitsign](https://github.com/sigstore/gitsign), keyless — the same OIDC token used for npm publishing is reused to get a short-lived signing certificate from Sigstore's Fulcio, so there is no static signing key either. Verify a tag with `gitsign verify --certificate-identity-regexp='.*' --certificate-oidc-issuer=https://token.actions.githubusercontent.com <tag>`.

---

## Continuous Scanning

- **Socket.dev:** every push and pull request is scanned for supply-chain risk in the dependency tree (`pnpm run validate:socket` locally, gated in CI) — install scripts, obfuscated code, typosquatting, and similar signals on every direct and transitive dependency.
- **CodeQL:** static analysis for common vulnerability classes runs on every push/PR and on a weekly schedule, independent of the Socket.dev dependency-focused scan.
- **Renovate:** checks weekly for outdated/vulnerable dependencies (both npm packages and GitHub Actions) across the whole pnpm workspace and opens a PR per update — grouped by minor/patch to reduce noise, with a Dependency Dashboard issue tracking everything in one place. Chosen over Dependabot for its more reliable monorepo/workspace grouping at package-count scale. PRs go through the same CI gates as any other PR; nothing merges automatically.
- **OpenSSF Scorecard:** runs on every push to `main` and weekly, scoring the repo's own security posture (branch protection, CI presence, dependency pinning, and similar signals) — published to the public Scorecard API and uploaded to this repo's Code Scanning tab.
- **Secret scanning:** GitHub's secret scanning and push protection are enabled on this repository — a commit containing a recognizable credential is blocked before it's ever pushed, not just flagged after the fact.

## Software Bill of Materials

Every release generates a [CycloneDX](https://cyclonedx.org/) SBOM per package (`pnpm run sbom`, production dependencies only — devDependencies aren't part of what a consumer installs), uploaded as a workflow artifact on the `Release` run. Consumers who need to verify exactly what's inside a given version of `@codeminity/axios`, `@codeminity/fetch`, or `@codeminity/request-core` can download it from that run instead of reconstructing the dependency tree themselves.
