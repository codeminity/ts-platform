# Contributing to @codeminity/fetch

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

This repository is a monorepo containing `@codeminity/fetch`, `@codeminity/axios`, and `@codeminity/request-core`. Most changes to lifecycle behavior (auth, retry, refresh) belong in `request-core`; changes to how that lifecycle is applied to a native `fetch` call belong in this package. See [ARCHITECTURE.md](./ARCHITECTURE.md) if you're unsure which package a change belongs in.

Build everything:

```bash
pnpm build
```

## Project Structure

```text
src/
├── index.ts        # public entry point
├── create.ts        # createFetch() factory
├── auth/            # auth header creation, auth application, refresh dependency wiring
├── retry/           # retry decision logic and its config shape
├── errors/          # outcome classification, error event emission
├── shared/           # request orchestration and shared config shapes
└── mocks/           # test fixtures used across multiple features
```

Only exports from `src/index.ts` are public API. Changes inside `src/auth`, `src/retry`, `src/errors`, or `src/shared` are internal and don't require a major version bump on their own, but should still be covered by tests and should not leak new behavior into the public surface without a corresponding types/README update.

## Development Workflow

1. Open an issue first for anything beyond a small fix, so the approach can be discussed before you invest time in an implementation.
2. Create a branch from `main`.
3. Make your change, including tests.
4. Run the full test suite and linter locally before opening a PR.
5. Update the relevant documentation (`README.md`) if behavior or configuration options changed. **Documentation must match the shipped implementation** — if a PR changes runtime behavior, the docs update is part of the PR, not a follow-up.

Every export reachable from `src/index.ts` also needs a real TSDoc summary and release tag — `pnpm verify:packages` runs API Extractor in strict mode and fails on undocumented exports or a stale report. If it fails because the change was intentional, sync `etc/fetch.api.md` by running `pnpm exec api-extractor run --local` inside this package and committing the result.

## Testing

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

Guidelines:

- Unit test lifecycle logic in `@codeminity/request-core` independently of `fetch` where possible.
- Shared auth config/refresh-queue mocks come from `@codeminity/request-core/test-utils` — don't duplicate them locally.
- Stub the global `fetch` (`vi.stubGlobal('fetch', vi.fn())`) for integration-style tests rather than hitting a real network.
- Any bug fix should include a regression test that fails before the fix and passes after.
- Concurrency-sensitive code (refresh coordination, retry counters) needs tests that simulate concurrent requests, not just sequential ones.

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add support for custom retry delay strategies
fix: prevent duplicate refresh calls under concurrent 401s
docs: correct refresh queue scoping in README
refactor: extract retry decision logic into request-core
test: add concurrency test for refresh coordination
```

This is used to generate changelogs automatically, so accuracy matters.

## Pull Request Process

1. Fill out the PR template, including what changed and why.
2. Link the related issue, if any.
3. Ensure CI passes (build, lint, test).
4. If the change affects runtime behavior or the public API, run `pnpm changeset` from the repo root and commit the generated file — this is required for the change to ever be published (see the [root CONTRIBUTING.md](../../../CONTRIBUTING.md#releasing-changesets)).
5. A maintainer will review for correctness, API surface impact, and documentation accuracy.
6. PRs that change public configuration shape (new/renamed `codeminity` options) require a corresponding update to the TypeScript types and the README API reference.
7. PRs that change internal-but-observable behavior must update the docs in the same PR — see [DECISIONS.md](./DECISIONS.md) for how these tradeoffs get recorded.

## Reporting Issues

Please include:

- package version
- Node.js version (or browser, if applicable)
- minimal reproduction (a small snippet or repo is ideal)
- expected vs. actual behavior

Use the issue tracker on the GitHub repository.

## Reporting Security Issues

Do not open a public issue for security vulnerabilities. Instead, contact the maintainers directly through the repository's security advisory process (GitHub Security Advisories) so a fix can be prepared before public disclosure.

## Design Discussions

Non-trivial design decisions (new configuration options, changes to instance scoping, changes to the resolve/throw contract) should be proposed as an issue tagged `design-discussion` before implementation, and the outcome recorded in [DECISIONS.md](./DECISIONS.md).
