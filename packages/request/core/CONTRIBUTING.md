# Contributing to @codeminity/request-core

Thanks for considering a contribution. This document covers how to set up the project, the conventions the codebase follows, and how to submit changes.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Reporting Security Issues](#reporting-security-issues)
- [Design Discussions](#design-discussions)

---

## Code of Conduct

Be respectful, be constructive, and assume good faith. Disagreements about design are welcome and expected — personal attacks are not.

## Getting Started

```bash
git clone https://github.com/codeminity/ts-platform.git
cd ts-platform
pnpm install
```

This repository is a monorepo containing `@codeminity/request-core` alongside the adapters built on it (`@codeminity/axios`, `@codeminity/fetch`). Transport-agnostic lifecycle logic (auth, retry, refresh) belongs here; anything specific to a particular transport belongs in the adapter that uses it. See [ARCHITECTURE.md](./ARCHITECTURE.md) if you're unsure which package a change belongs in.

Build everything:

```bash
pnpm build
```

## Project Structure

```text
src/
├── index.ts          # public entry point
├── test-utils.ts      # public test-utils entry point (separate build, not bundled into index)
├── auth/             # token lifecycle, refresh coordination, auth config shape
│   └── mocks/        # factory-based mocks, re-exported via test-utils.ts
├── retry/            # retry config shape, delay utility
└── errors/           # error event classification enum
```

Only `src/index.ts` and `src/test-utils.ts` are public API (see [ARCHITECTURE.md](./ARCHITECTURE.md#public-api)). Everything else is internal and doesn't require a major version bump on its own, but should still be covered by tests and should not leak new behavior into the public surface without a corresponding types/README update.

Imports across package boundaries must go through a package's public entry point — never reach into another package's `src/` directly:

```text
❌ import { something } from '../../axios/src/internal-file'
✔ import { something } from '@codeminity/axios'
```

## Development Workflow

1. Open an issue first for anything beyond a small fix, so the approach can be discussed before you invest time in an implementation.
2. Create a branch from `main`.
3. Make your change, including tests.
4. Run the full test suite and linter locally before opening a PR.
5. Update the relevant documentation (`README.md`) if behavior or configuration options changed. **Documentation must match the shipped implementation** — if a PR changes runtime behavior (e.g. what the refresh queue guarantees, what `handleRefreshToken` does on a failed refresh), the docs update is part of the PR, not a follow-up.

## Testing

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

Guidelines:

- Factory-based mocks only — no auto-mocking.
- No `any` — strict TypeScript throughout.
- Test lifecycle logic (refresh coordination, token flow, retry decisions) fully in isolation from any transport; this package should never need a mock HTTP server to test itself.
- Any bug fix should include a regression test that fails before the fix and passes after.
- Concurrency-sensitive code (the refresh queue, in particular) needs tests that simulate concurrent calls, not just sequential ones.

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add support for custom refresh queue timeout
fix: prevent duplicate refresh calls under concurrent expirations
docs: correct refresh queue scoping in README
refactor: extract token-check logic into its own module
test: add concurrency test for refresh coordination
```

This is used to generate changelogs automatically, so accuracy matters — a `fix:` that's actually a behavior change affecting configuration should usually be `feat:` or called out with a `BREAKING CHANGE:` footer instead.

## Pull Request Process

1. Fill out the PR template, including what changed and why.
2. Link the related issue, if any.
3. Ensure CI passes (build, lint, test).
4. If the change affects runtime behavior or the public API of this package, run `pnpm changeset` from the repo root and commit the generated file — this is required for the change to ever be published (see the [root CONTRIBUTING.md](../../../CONTRIBUTING.md#releasing-changesets)). Every export reachable from `src/index.ts` also needs a real TSDoc summary and release tag — `pnpm verify:packages` runs API Extractor in strict mode and fails on undocumented exports or a stale report. If it fails because the change was intentional, sync `etc/request-core.api.md` by running `pnpm exec api-extractor run --local` inside this package and committing the result.
5. A maintainer will review for correctness, API surface impact, and documentation accuracy.
6. PRs that change public configuration shape (new/renamed fields on `AuthConfig`, `RetryConfig`, or similar) require a corresponding update to the TypeScript types and the README API reference.
7. PRs that change internal-but-observable behavior (e.g., what the refresh queue guarantees under concurrent calls) must update the docs in the same PR — see [DECISIONS.md](./DECISIONS.md) for how these tradeoffs get recorded.

## Reporting Issues

Please include:

- package version
- Node.js version
- minimal reproduction (a small snippet or repo is ideal)
- expected vs. actual behavior

Use the issue tracker on the GitHub repository. Feature requests are welcome — please describe the use case, not just the desired API, so the maintainers can evaluate whether it's genuinely transport-agnostic (and belongs here) or is specific to one adapter.

## Reporting Security Issues

Do not open a public issue for security vulnerabilities. Instead, contact the maintainers directly through the repository's security advisory process (GitHub Security Advisories) so a fix can be prepared before public disclosure.

## Design Discussions

Non-trivial design decisions (new public exports, changes to what the refresh queue guarantees, changes to the shape of shared config types) should be proposed as an issue tagged `design-discussion` before implementation, and the outcome recorded in [DECISIONS.md](./DECISIONS.md).
