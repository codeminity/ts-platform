# @codeminity/request-core

This package provides the foundational logic for managing request-related workflows such as authentication lifecycle, retry coordination, and safe concurrency control.

It is intentionally framework-agnostic and does not implement any HTTP client itself.

---

## Overview

`@codeminity/request-core` is responsible for handling the internal mechanics of request orchestration, including:

- Authentication state management
- Token expiration handling
- Refresh token coordination
- Request retry strategies
- Safe concurrency control for async operations

It is designed to be consumed by higher-level adapters and should not be used directly as a request client.

---

## Design Principles

### Separation of concerns

This package does not perform network requests.  
It only defines the logic required to manage request flows.

### Deterministic behavior

All async flows are predictable and testable, with no hidden side effects.

### Single responsibility

Each utility solves one well-defined problem and remains composable.

### No runtime assumptions

No dependency on any HTTP library, framework, or execution environment.

---

## Core Responsibilities

### Authentication lifecycle

Handles logic around:

- token validation
- expiration checks
- refresh triggering

### Refresh coordination

Ensures that concurrent refresh operations are handled safely by queueing execution and preventing duplicate refresh calls.

### Async control utilities

Provides utilities for:

- delaying execution
- controlling async flow
- ensuring predictable sequencing

---

## Key Abstractions

### Refresh Queue

A mechanism that ensures only one refresh operation runs at a time.

Subsequent requests are queued and resolved when the active operation completes.

### Token Handling Flow

Defines a structured flow:

1. Check if token exists
2. Check if token is expired
3. Trigger refresh if needed
4. Prevent duplicate refresh calls during concurrent execution

### Safe Async Execution

Utilities that ensure async tasks behave predictably under concurrency.

---

## API Surface

The package exposes a minimal and stable API:

- `handleRefreshToken`
- `createRefreshQueue`
- `delay`

These primitives are designed to be composed into higher-level request systems.

---

## Mental Model

Instead of thinking in terms of HTTP libraries, think in flows:

- Is the token still valid?
- If not, should it be refreshed?
- Is a refresh already running?
- Should this request wait or continue?

This package provides the primitives to express those rules clearly.

---

## Testing Strategy

This package is fully covered using **Vitest**.

Testing principles:

- Factory-based mocks (no auto-mocking)
- Deterministic async behavior
- Fake timers only when necessary
- Strict TypeScript safety (no `any`)
- Clear separation of unit concerns

---

## Constraints

This package explicitly avoids:

- HTTP client implementation
- Framework-specific integrations
- Global state
- Hidden async behavior
- Opinionated request pipelines

---

## Usage Scope

This is a **low-level infrastructure package**.

It is intended to be used by adapters such as:

- HTTP clients
- Fetch wrappers
- Custom request engines

It should not be used directly in application-level code.

---

## License

MIT
