# Contributing to @codeminity/axios

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

This repository is a monorepo containing both `@codeminity/axios` and `@codeminity/request-core`. Most changes to lifecycle behavior (auth, retry, refresh) belong in `request-core`; changes to Axios wiring belong in this package. See [ARCHITECTURE.md](./ARCHITECTURE.md) if you're unsure which package a change belongs in.

Build everything:

```bash
pnpm build
```

Run the package locally against an example app:

```bash
pnpm --filter @codeminity/axios dev
```

## Project Structure

```text
src/
├── index.ts        # public entry point
├── create.ts        # instance creation (axios.create wrapper)
├── auth/            # auth header creation, auth interceptor, refresh dependency wiring
├── retry/           # retry decision logic and its config shape
├── errors/          # error event classification, mapping, emission
├── shared/          # cross-feature orchestration and shared config shapes
└── mocks/           # test fixtures used across multiple features
```

Only exports from the package root (`src/index.ts`) are public API. Changes inside `src/auth`, `src/retry`, `src/errors`, or `src/shared` are internal and don't require a major version bump on their own, but should still be covered by tests and should not leak new behavior into the public surface without a corresponding types/README update.

## Development Workflow

1. Open an issue first for anything beyond a small fix, so the approach can be discussed before you invest time in an implementation.
2. Create a branch from `main`.
3. Make your change, including tests.
4. Run the full test suite and linter locally before opening a PR.
5. Update the relevant documentation (`README.md`, and any file under `docs/guides/`) if behavior or configuration options changed. **Documentation must match the shipped implementation** — if a PR changes runtime behavior (e.g. what state is shared across instances, what the default retry behavior is), the docs update is part of the PR, not a follow-up.

## Testing

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

Guidelines:

- Unit test lifecycle logic in `@codeminity/request-core` independently of Axios where possible.
- Shared auth config/refresh-queue mocks come from `@codeminity/request-core/test-utils` — don't duplicate them locally; if a new adapter package needs the same fixtures, they belong there too.
- Integration-test the Axios adapter against a mock HTTP server rather than mocking `axios` internals directly.
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

This is used to generate changelogs automatically, so accuracy matters — a `fix:` that's actually a behavior change affecting configuration should usually be `feat:` or called out with a `BREAKING CHANGE:` footer instead.

## Pull Request Process

1. Fill out the PR template, including what changed and why.
2. Link the related issue, if any.
3. Ensure CI passes (build, lint, test).
4. If the change affects runtime behavior or the public API of `@codeminity/axios` or `@codeminity/request-core`, run `pnpm changeset` from the repo root and commit the generated file — this is required for the change to ever be published (see the [root CONTRIBUTING.md](../../../CONTRIBUTING.md#releasing-changesets)).
5. A maintainer will review for correctness, API surface impact, and documentation accuracy.
6. PRs that change public configuration shape (new/renamed `codeminity` options) require a corresponding update to the TypeScript types, the README API reference table, and any affected guide under `docs/guides/`.
7. PRs that change internal-but-observable behavior (e.g., scope of shared state between instances) must update the docs in the same PR — see [DECISIONS.md](./DECISIONS.md) for how these tradeoffs get recorded.

## Reporting Issues

Please include:

- package version
- Node.js version
- minimal reproduction (a small snippet or repo is ideal)
- expected vs. actual behavior

Use the issue tracker on the GitHub repository. Feature requests are welcome — please describe the use case, not just the desired API, so the maintainers can evaluate whether it belongs in this package or in `request-core`.

## Reporting Security Issues

Do not open a public issue for security vulnerabilities. Instead, contact the maintainers directly through the repository's security advisory process (GitHub Security Advisories) so a fix can be prepared before public disclosure.

## Design Discussions

Non-trivial design decisions (new configuration options, changes to instance scoping, changes to what's shared vs. isolated between instances) should be proposed as an issue tagged `design-discussion` before implementation, and the outcome recorded in [DECISIONS.md](./DECISIONS.md).
