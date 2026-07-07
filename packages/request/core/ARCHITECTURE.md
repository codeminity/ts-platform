# Architecture - @codeminity/request-core

## Overview

This package is a low-level orchestration engine for request lifecycle management.

It does NOT perform HTTP requests.

---

## Core Layers

### 1. Authentication Layer

Responsible for:

- token validation
- expiration detection
- refresh triggering

---

### 2. Concurrency Layer

Ensures safe execution of async flows:

- prevents duplicate refresh calls
- queues concurrent operations
- guarantees deterministic execution order

---

### 3. Timing Utilities

Provides utilities such as delay and async coordination helpers.

---

## Data Flow Model

Request
↓
Check Token
↓
Is Expired?
↓
Queue Refresh (if needed)
↓
Continue Execution

---

## Design Constraints

- No framework dependency
- No HTTP client dependency
- No global state
- Fully deterministic async behavior

---

## Public API

Only this surface is stable:

- handleRefreshToken
- createRefreshQueue
- delay

Everything else is internal and may change.

---

## Concurrency Model

Only one refresh operation can run at a time.

Subsequent calls are queued and resolved sequentially.

---

## Philosophy

This package does not try to "send requests".

It ensures that request systems behave correctly under real-world concurrency and authentication constraints.
