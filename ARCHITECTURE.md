# ts-platform Architecture

This document defines the structural rules of the ts-platform monorepo.

---

## System Design

ts-platform is a monorepo of independent, composable packages.

Each package:

- has a single responsibility
- is independently buildable
- is independently publishable
- does not depend on internal implementation of other packages

---

## Dependency Rules

### Allowed

- adapter → core
- packages → utilities

### Not Allowed

- core → adapter
- deep internal package imports
- circular dependencies

---

## Package Layers

### Core Layer

Pure logic with no external integrations.

- no framework dependency
- no I/O concerns
- no UI concerns

### Adapter Layer

Integration layer for external systems.

- depends on core
- exposes public APIs

---

## Public API Rule

Only `exports` defined in `package.json` are public.

Deep imports are forbidden.

---

## Async Model

- deterministic execution
- explicit control of concurrency
- no hidden async side effects

---

## State Rule

- no global mutable state, with one documented exception: `@codeminity/axios`'s default export intentionally shares Axios's own global `.defaults`/`.interceptors` for parity with plain Axios — see [Instance Isolation](./packages/request/axios/ARCHITECTURE.md#instance-isolation). Anything created via `axios.create()` is fully isolated.
- state must be explicit and scoped

---

## Design Goal

ts-platform must remain:

- predictable
- composable
- framework-agnostic
- minimal in abstraction
