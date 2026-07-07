# Architecture Decisions (ts-platform)

This document records key architectural decisions.

---

## No Auto Mocking

Auto-mocking is not allowed.

### Reason:

- reduces test clarity
- introduces hidden behavior
- harms maintainability

---

## Factory-Based Mocks

All mocks must be created explicitly using factory functions.

### Benefits:

- deterministic tests
- full control over behavior
- type safety

---

## ESM Only

ts-platform is ESM-only.

### Reason:

- modern ecosystem alignment
- better tree-shaking
- simpler bundling

---

## Independent Packages

Each package is independently versioned and published.

### Reason:

- scalability
- flexibility
- reduced coupling

---

## Minimal Abstraction Principle

Abstraction is allowed only when:

- duplication is proven
- complexity is real and measurable

Otherwise prefer explicit implementation.
