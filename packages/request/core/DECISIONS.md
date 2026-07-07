# Architecture Decisions - request-core

## 1. Why no HTTP client?

We intentionally avoid coupling with any HTTP library to keep this package reusable across environments.

---

## 2. Why queue-based refresh handling?

Concurrent refresh requests are a common source of race conditions.

A queue ensures:

- single refresh execution
- predictable ordering
- no duplicated network calls

---

## 3. Why factory-based testing?

We avoid auto-mocking because:

- it hides real dependencies
- reduces test clarity
- introduces unpredictable behavior

Factories ensure deterministic tests.

---

## 4. Why strict public API?

We enforce a minimal surface area:

- easier maintenance
- safer versioning
- predictable ecosystem integration

---

## 5. Why no framework assumptions?

This package must remain usable in:

- Node.js
- browsers
- edge runtimes
- custom runtimes

---

## 6. Why no global state?

Global state introduces:

- hidden coupling
- race conditions
- unpredictable behavior under concurrency

All state is explicitly passed or scoped.
