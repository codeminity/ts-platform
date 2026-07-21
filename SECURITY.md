# Security Policy

## Supported Versions

Only the latest release of each package in `ts-platform` is supported.

| Package Version | Supported |
| --------------- | --------- |
| latest          | ✅        |
| < latest        | ❌        |

---

## Reporting a Vulnerability

🚨 **Do NOT open public issues for security vulnerabilities.**

Please report security issues privately via:

- Email: security@codeminity.dev

We aim to respond within **48–72 hours**.

---

## Scope

ts-platform provides low-level infrastructure primitives for the Codeminity ecosystem.

Security-sensitive areas include:

- concurrency primitives (refresh queue / async coordination)
- retry orchestration
- authentication/token handling

This repository does **not** handle:

- payment processing
- user authentication systems
- direct network services (except via adapters)

---

## Security Principles

This project is designed with:

- no hidden side effects
- deterministic async execution
- minimal external dependencies
- explicit control flow
- no global mutable state, except one documented case in `@codeminity/axios`'s default export (shared with plain Axios's own singleton for API parity) — see [ARCHITECTURE.md](./ARCHITECTURE.md#state-rule)

---

## Disclosure Policy

We follow responsible disclosure.  
Security fixes will be released as soon as patches are available.
