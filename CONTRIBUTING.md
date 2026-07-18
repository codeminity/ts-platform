# Contributing to ts-platform

Thank you for contributing.

ts-platform is a modular monorepo of independent packages within the Codeminity ecosystem.

---

## Core Principles

- avoid unnecessary abstraction
- no hidden behavior
- explicit is better than implicit
- maintain package independence
- deterministic execution required
- composability over coupling

---

## Monorepo Structure Rules

- each package must remain independently buildable
- internal cross-package imports are allowed only via public APIs
- no deep imports between internal modules
- shared utilities must live in dedicated packages

---

## Code Style

- TypeScript only
- no `any`
- strict mode enabled
- no eslint-disable unless justified
- prefer explicit return types for public APIs

---

## Testing Rules

- Vitest only
- deterministic tests required
- no flaky or time-dependent tests
- mocks must be explicit (no auto-mocking)
- tests live next to packages

---

## Package Verification

Before opening a pull request, verify all workspace packages:

```bash
pnpm run verify:packages
```

This command runs the complete package verification pipeline, including:

- Packing and installing the published tarball
- Runtime import verification
- publint
- API Extractor

---

## Commit Convention

Use conventional commits:

- feat: add retry strategy
- fix: resolve race condition in queue
- refactor: simplify async pipeline
- chore: update tooling

Avoid:

- "fix stuff"
- "update"
- "wip"

---

## Releasing (Changesets)

Every PR that changes the runtime behavior, public API, or fixes a bug in any package under `packages/` **must** include a changeset:

```
pnpm changeset
```

This prompts for the affected package(s), the semver bump (`patch` / `minor` / `major`), and a short summary — then writes a file to `.changeset/`. Commit that file as part of the PR.

Skip this only for changes that can't affect a published package: docs-only edits, CI/tooling config, internal test-only changes with no behavior implication. When unsure, add one — an unnecessary changeset is a much smaller problem than a shipped fix nobody ever gets.

Versioning (`pnpm version-packages`) and publishing (`pnpm release`) are run separately, outside individual PRs — see the release workflow for the current process.

---

## Pull Requests

Before submitting:

- tests pass
- lint passes
- build passes
- scope is minimal
- changes are well described

---

## Philosophy Reminder

ts-platform is not about adding code.

It is about designing systems that remain simple as they scale.
