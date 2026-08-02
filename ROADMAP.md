# Roadmap

This describes the general direction for ts-platform over the next year. It
is not a fixed schedule — priorities may shift, but the intent below is
stable.

## What we intend to do

- **Stabilize public APIs.** `@codeminity/axios`, `@codeminity/fetch`, and
  `@codeminity/request-core` are still pre-1.0 (see each package's
  `CHANGELOG.md`). Work continues toward API stability ahead of a 1.0
  release for each.
- **Keep quality bars where they are, not lower them.** 100% test coverage
  (statements/branches/functions/lines) and mutation testing stay mandatory
  as the codebase grows — see [CONTRIBUTING.md](./CONTRIBUTING.md#testing-rules).
- **Keep the supply-chain security posture current.** Socket.dev, CodeQL,
  OpenSSF Scorecard, and SBOM generation (see
  [SECURITY.md](./SECURITY.md#continuous-scanning)) continue to run on every
  change; findings get triaged and fixed, not silenced.
- **Grow governance as the contributor base grows.** The project is
  currently single-maintainer (see [GOVERNANCE.md](./GOVERNANCE.md)); adding
  trusted maintainers and formalizing a review process is a priority once
  there's a sustained contributor base to draw from.
- **Evaluate new adapters and packages** for the Codeminity ecosystem based
  on real, demonstrated need — not speculative scope.

## What we do not intend to do

- Take on concerns outside this repo's stated scope (payment processing,
  user authentication systems, direct network services) — see
  [SECURITY.md#scope](./SECURITY.md#scope).
- Add abstraction or configuration surface for hypothetical future use
  cases — see [CONTRIBUTING.md](./CONTRIBUTING.md#core-principles).
- Break public APIs without a major version bump and a changeset
  documenting the change.
