# ts-platform

ts-platform is a universal, modular monorepo platform within the Codeminity ecosystem.

It provides a collection of independent, composable building blocks designed to simplify and standardize software development in a clean, predictable, and runtime-agnostic way.

It is not tied to any specific framework, runtime, or architecture. Instead, it focuses on small, reliable primitives that can be combined to build larger systems across different environments.

---

## Philosophy

- Keep things simple, even when systems grow complex
- Prefer explicit behavior over hidden magic
- Build small, composable, independent units
- Stay close to familiar JavaScript/TypeScript patterns
- Avoid assumptions about runtime or architecture

The goal is not to replace existing tools, but to improve consistency and composability across them.

---

## Design Principles

### Independence First

Each package is fully independent and self-contained.

### Minimal Abstraction

Abstractions are introduced only when they remove proven complexity.

### Predictability

APIs behave in a consistent and easy-to-reason-about way.

### Runtime Agnostic

No assumptions about environment, framework, or deployment target.

---

## Structure

This repository is a monorepo containing independently maintained packages.

Each package is:

- independently versioned
- independently buildable
- independently testable
- independently publishable

Packages can be composed, but are never required to depend on each other.

---

## Tooling

- pnpm for dependency management
- TurboRepo for orchestration
- TypeScript for type safety
- Vitest for testing
- ESLint for code quality
- Prettier for formatting
- API Extractor for public API verification
- publint for package quality validation
- ESM-first design

---

## Goals

- reduce duplicated infrastructure logic
- improve consistency across packages
- enable scalable composition of primitives
- remain flexible across different use cases

---

## Non-Goals

- enforcing architecture on consumers
- framework or runtime lock-in
- unnecessary abstraction layers
- opinionated application structure

---

## License

MIT
