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
