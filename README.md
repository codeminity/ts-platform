# ts-platform

[![CI](https://img.shields.io/github/actions/workflow/status/codeminity/ts-platform/ci.yml?label=CI)](https://github.com/codeminity/ts-platform/actions)
[![license](https://img.shields.io/npm/l/%40codeminity%2Faxios.svg)](./LICENSE)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/13923/badge)](https://www.bestpractices.dev/projects/13923)

A collection of production-ready TypeScript packages, published as `@codeminity/*` on npm:

- **HTTP requests** — [`@codeminity/axios`](./packages/request/axios) and [`@codeminity/fetch`](./packages/request/fetch), built on a shared, framework-agnostic core, [`@codeminity/request-core`](./packages/request/core) — with built-in retry logic (exponential backoff, jitter, `Retry-After` support), JWT authentication, and automatic token refresh.
- **UI components** — [`@codeminity/ui-kit`](./packages/ui-kit), framework-agnostic Web Components (built with Lit) styled through CSS custom-property design tokens — usable from Vue, React, Angular, or plain HTML.

ts-platform is the universal, modular monorepo platform within the Codeminity ecosystem that hosts them.

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

Each package has a single responsibility and does not depend on another package's internals. Adapter packages (e.g. `@codeminity/axios`) may depend on core packages (e.g. `@codeminity/request-core`) through their public API — see [ARCHITECTURE.md](./ARCHITECTURE.md#dependency-rules) for the allowed dependency directions.

### Minimal Abstraction

Abstractions are introduced only when they remove proven complexity.

### Predictability

APIs behave in a consistent and easy-to-reason-about way.

### Runtime Agnostic

No assumptions about environment, framework, or deployment target.

---

## Packages

| Package                                               | Version                                                                                                                     | Description                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [`@codeminity/request-core`](./packages/request/core) | [![npm](https://img.shields.io/npm/v/@codeminity/request-core.svg)](https://www.npmjs.com/package/@codeminity/request-core) | Framework-agnostic request lifecycle engine (auth, refresh coordination, retry orchestration). |
| [`@codeminity/axios`](./packages/request/axios)       | [![npm](https://img.shields.io/npm/v/@codeminity/axios.svg)](https://www.npmjs.com/package/@codeminity/axios)               | Axios adapter built on top of `@codeminity/request-core`.                                      |
| [`@codeminity/fetch`](./packages/request/fetch)       | [![npm](https://img.shields.io/npm/v/@codeminity/fetch.svg)](https://www.npmjs.com/package/@codeminity/fetch)               | Native `fetch` adapter built on top of `@codeminity/request-core`.                             |
| [`@codeminity/ui-kit`](./packages/ui-kit)             | [![npm](https://img.shields.io/npm/v/@codeminity/ui-kit.svg)](https://www.npmjs.com/package/@codeminity/ui-kit)             | Framework-agnostic UI components built as native Web Components (Lit).                         |

Each package has its own README with installation instructions, a quick start, and full documentation.

---

## Structure

This repository is a monorepo containing independently maintained packages.

Each package is:

- independently versioned
- independently buildable
- independently testable
- independently publishable

Packages are designed to remain independent and avoid unnecessary coupling.

Packages may depend on other packages through their public APIs when composition requires it, but internal implementation details are never shared directly.

---

## Tooling

- pnpm for dependency management
- TurboRepo for orchestration
- TypeScript for type safety
- Vitest for testing
- fast-check for property-based testing
- Stryker for mutation testing
- Playwright for real-browser end-to-end testing
- dependency-cruiser for architecture-boundary enforcement
- Socket.dev and CodeQL for supply-chain and security scanning
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

## Documentation

- [Architecture](./ARCHITECTURE.md)
- [Decisions](./DECISIONS.md)
- [Compatibility](./COMPATIBILITY.md)
- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)
- [Assurance Case](./ASSURANCE_CASE.md)
- [Governance](./GOVERNANCE.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Roadmap](./ROADMAP.md)

---

## License

MIT
