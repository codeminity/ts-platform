# Governance

## Model

ts-platform is currently maintained by a single maintainer, who has final
say over technical direction, what gets merged, and when releases happen.
This is a deliberate, simple model for the project's current size — not a
statement that it will stay this way forever. As the contributor base grows,
this document will be updated to reflect a shared decision-making process
(e.g. a defined path to becoming a maintainer, multi-maintainer review
requirements).

## Roles

### Maintainer

Currently: **Masoud Fooladi** ([@masoudfooladi-me](https://github.com/masoudfooladi-me)).

Responsible for:

- reviewing and merging pull requests
- triaging issues
- deciding technical direction and architecture (see [ARCHITECTURE.md](./ARCHITECTURE.md) and [DECISIONS.md](./DECISIONS.md))
- cutting releases (see [CONTRIBUTING.md#releasing-changesets](./CONTRIBUTING.md#releasing-changesets))
- responding to security reports (see [SECURITY.md](./SECURITY.md))
- enforcing the [Code of Conduct](./CODE_OF_CONDUCT.md)

### Contributors

Anyone who opens an issue, submits a pull request, or otherwise
participates following [CONTRIBUTING.md](./CONTRIBUTING.md). Contributors
have no special repository privileges but are credited via their pull
requests and commit history.

## Decision-Making

- Day-to-day changes (bug fixes, small features, dependency updates) are
  merged directly by the maintainer once CI passes and the change follows
  [CONTRIBUTING.md](./CONTRIBUTING.md).
- Larger or breaking changes (new packages, public API changes, architectural
  shifts) are documented as an ADR in [DECISIONS.md](./DECISIONS.md) before
  or alongside implementation, so the reasoning is preserved, not just the
  outcome.
- Disagreements raised in an issue or PR are resolved by discussion first;
  if no consensus is reached, the maintainer makes the final call.

## Becoming a Maintainer

There is currently no formal process, since the project has a single
maintainer. A contributor with a sustained history of high-quality,
trusted contributions may be invited to take on maintainer responsibilities;
this document will be updated with the concrete criteria and process once
that becomes relevant.
