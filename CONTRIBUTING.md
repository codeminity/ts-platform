# Contributing to ts-platform

Thank you for contributing.

ts-platform is a modular monorepo of independent packages within the Codeminity ecosystem.

---

## Development Setup

```bash
git clone https://github.com/codeminity/ts-platform.git
cd ts-platform
corepack enable
pnpm install
pnpm test
```

`pnpm install` also sets up the Husky git hooks (commit-msg, pre-commit) automatically — no separate setup step needed. The only prerequisites are Node.js `^22.13.0 || >=24.0.0` and pnpm, whose exact version is pinned via `packageManager` in `package.json` and installed automatically by Corepack.

To reset back to a fresh-clone state:

```bash
pnpm run clean
```

Deletes exactly `node_modules`, every package's `dist`/`node_modules`/`.turbo`/`temp`, `coverage`, `.turbo`, `.husky/_`, and the various generated reports (`reports`, `test-results`, `playwright-report`, `blob-report`, `.stryker-tmp`, `sbom`, `results.sarif`, `bench-baseline.json`) — an explicit allowlist in `scripts/clean.ts`, not `git clean`, so it can never reach further than intended.

---

## Core Principles

- avoid unnecessary abstraction
- no hidden behavior
- explicit is better than implicit
- maintain package independence
- deterministic execution required
- composability over coupling

---

## Monorepo Structure Rules

- each package must remain independently buildable
- internal cross-package imports are allowed only via public APIs
- no deep imports between internal modules
- shared utilities must live in dedicated packages

The `core → adapter` direction and circular dependencies aren't just documented — they're enforced by `dependency-cruiser` (`pnpm run validate:deps`, also run in CI). A PR that adds an import violating either fails the build; see [ARCHITECTURE.md](./ARCHITECTURE.md#enforcement).

---

## Code Style

- TypeScript only
- no `any`
- strict mode enabled
- no eslint-disable unless justified
- prefer explicit return types for public APIs
- relative imports/exports in `packages/*/*/src` must include an explicit `.js` extension (e.g. `from './create.js'`), even though the dev-facing `moduleResolution: "Bundler"` doesn't require it — `tsc --emitDeclarationOnly` copies the specifier into the published `.d.ts` essentially verbatim, and a real consumer using `moduleResolution: "NodeNext"`/`"node16"` needs that extension to resolve it. Checked by `pnpm run validate:node-resolution`; see [DECISIONS.md](./DECISIONS.md#explicit-js-extensions-for-relative-imports).

---

## Testing Rules

- Vitest only
- deterministic tests required
- no flaky or time-dependent tests
- mocks must be explicit (no auto-mocking)
- tests live next to packages
- `stryker.config.ts`'s `mutate` glob covers every package's production code
  (`packages/*/*/src`) — any new file added there is mutation-tested
  automatically, no config edits needed. `scripts/` is deliberately excluded
  — see [DECISIONS.md](./DECISIONS.md#adr-007-mutation-testing-scope)
- run `pnpm run test:mutation` before relying on 100% coverage as proof a new
  test actually verifies behavior — coverage alone doesn't catch e.g. a
  missing `?.` or an off-by-one that no test's inputs happen to expose
- a mutant may legitimately be unkillable (e.g. a redundant `?.` inside a
  catch that already swallows the same failure) — mark it with
  `// Stryker disable next-line <Mutator>: <reason>` instead of writing a
  test that can't actually observe a difference
- functions with a real invariant across a wide input space (boundary
  conditions, classification tables, value-preserving transforms,
  concurrency coalescing) get a property-based test with `fast-check`
  alongside the regular one, named `<file>.property.test.ts` — see
  [DECISIONS.md](./DECISIONS.md#property-based-testing-scope). This
  doesn't conflict with "no flaky tests": a failing property means the
  _rule_ doesn't hold, not that the test infrastructure is unreliable —
  `fast-check` shrinks every failure to a minimal, reproducible
  counterexample

---

## Package Verification

CI runs the complete package verification pipeline on every PR — packing and installing each package's real tarball, runtime import verification, publint, and API Extractor. You don't need to run it locally for every change.

If you're touching packaging config, `package.json` exports, or public API surface specifically, it's worth running it yourself first to get faster feedback:

```bash
pnpm run verify:packages
```

---

## Bundle Size

Every published entry point has a brotli size limit enforced in CI (`pnpm run validate:size`, via [size-limit](https://github.com/ai/size-limit)), configured in [`.size-limit.json`](./.size-limit.json). This exists because it's already bitten this project once: an unexternalized `vitest` import once grew `request-core`'s `test-utils` build from ~1KB to 554KB with nobody noticing until a manual audit. If a change legitimately needs a bigger budget, raise the relevant `limit` in `.size-limit.json` as part of the same PR — don't raise it reflexively just to make the check pass.

---

## Benchmarks

Performance-sensitive code (refresh queue concurrency, auth-attach overhead, retry decisions and orchestration, error classification, event dispatch) has [Vitest's built-in `bench()`](https://vitest.dev/guide/features.html#benchmarking) benchmarks colocated in each package's `bench/` folder, named `<file>.bench.ts` (Vitest's benchmarking runs on [tinybench](https://github.com/tinylibs/tinybench) under the hood — no separate benchmarking dependency or custom runner needed). Run all of them with:

```bash
pnpm run bench
```

Before making a performance-sensitive change, save a baseline; after, compare against it:

```bash
pnpm run bench:baseline   # writes bench-baseline.json (gitignored, machine-specific)
# ...make your change...
pnpm run bench:compare    # shows each result next to the baseline, e.g. "[0.85x] ⇓"
```

`--compare` is visual only — it annotates results, it does **not** fail the command on a regression, and neither `bench` nor `bench:compare` is wired into CI: shared runners are too noisy for benchmark numbers to be a meaningful pass/fail gate. Judge a regression by eye and mention the numbers in the PR if something meaningful moved.

---

## Commit Convention

Use conventional commits:

- feat: add retry strategy
- fix: resolve race condition in queue
- refactor: simplify async pipeline
- chore: update tooling

This is enforced mechanically, not just by reviewer discipline: a `commit-msg` git hook (Husky + commitlint, `commitlint.config.ts`) rejects a non-conventional commit message locally, before it's ever pushed. A `pre-commit` hook (`lint-staged.config.ts`) also runs ESLint and Prettier on staged files. Both install automatically on `pnpm install` (the `prepare` script) — no manual setup needed.

Avoid:

- "fix stuff"
- "update"
- "wip"

---

## Developer Certificate of Origin (DCO)

By contributing, you certify that you wrote the contribution yourself, or
otherwise have the right to submit it under the project's license, per the
[Developer Certificate of Origin](https://developercertificate.org/).

Sign off every commit to confirm this:

```bash
git commit -s -m "feat: add retry strategy"
```

`-s` appends a `Signed-off-by: Your Name <your.email@example.com>` trailer
using your configured git identity — no separate CLA or account needed.

---

## Releasing (Changesets)

Every PR that changes the runtime behavior, public API, or fixes a bug in any package under `packages/` **must** include a changeset:

```
pnpm changeset
```

This prompts for the affected package(s), the semver bump (`patch` / `minor` / `major`), and a short summary — then writes a file to `.changeset/`. Commit that file as part of the PR.

This is enforced in CI (`pnpm run validate:changeset`, i.e. `changeset status --since=origin/main`) — a PR that changes a package without an accompanying changeset fails the `Changeset Required` check. If a change genuinely doesn't need a release (docs, CI, tests only), run `pnpm changeset add --empty` instead of skipping this.

Skip this only for changes that can't affect a published package: docs-only edits, CI/tooling config, internal test-only changes with no behavior implication. When unsure, add one — an unnecessary changeset is a much smaller problem than a shipped fix nobody ever gets.

Versioning (`pnpm version-packages`) and publishing (`pnpm release`) are run separately, outside individual PRs, by [`.github/workflows/release.yml`](./.github/workflows/release.yml) on every push to `main`.

To cut a release: run `pnpm version-packages` on a branch named exactly `release/version-packages`, review the version bumps and hand-curate each changed `CHANGELOG.md` entry (the auto-generated text only covers changes that happened to carry a changeset — cross-check `git log` since the last release for anything else worth summarizing, e.g. CI/tooling/docs work that never needed one), commit as `chore(release): version packages for vX.Y.Z`, and open a PR. `changeset version` deletes every changeset it consumes in that same commit, so this PR always legitimately shows package changes with no changeset left to find — [`.github/workflows/changesets.yml`](./.github/workflows/changesets.yml) exempts the `release/version-packages` branch specifically from the `Changeset Required` check for exactly this reason.

`release/version-packages` is reserved exclusively for this purpose — never branch real feature/fix work from or onto it, and never reuse the name for anything else. It **must** be deleted immediately after each release PR merges, and recreated fresh from `main` the next time a release is cut. Both matter because the changeset-check exemption above is keyed to this exact branch name with no other check on its contents: a stale or repurposed `release/version-packages` branch would silently skip the "Changeset Required" gate for whatever unrelated changes ended up on it.

Publishing authenticates via **npm Trusted Publisher** (OIDC) — each package is configured on npmjs.com to trust this exact repo and workflow, so the workflow requests a short-lived token from GitHub's OIDC provider instead of using a stored `NPM_TOKEN` secret. There is no long-lived npm token anywhere in this repo, and none should be added; see [SECURITY.md](./SECURITY.md#release--supply-chain-security) for why. Every published package also carries npm provenance, attesting the tarball back to the exact commit and workflow run that built it.

### Renovate is dashboard-only here

[Renovate](https://docs.renovatebot.com/) is enabled and keeps its Dependency Dashboard issue current, but dependency bumps in this repo are done manually as part of the curated release process above, not by merging Renovate's own PRs. Treat its dashboard as an alert/visibility tool for what's outdated, not as automation — don't expect it to open or merge anything on its own schedule.

---

## Full Local Check

`pnpm run full-check` runs every check CI runs — `pnpm install --frozen-lockfile`, `pnpm audit`, build, lint, `validate:format`, typecheck, `test:coverage`, `validate:deps`, `validate:api-exports`, `validate:docs`, `verify:packages`, `validate:size` — in the same order as [ci.yml](./.github/workflows/ci.yml)'s `Test / Build / Lint` job, plus mutation testing and browser e2e tests (both otherwise separate/manual):

```bash
pnpm run full-check
```

It does not stop at the first failure — every check runs regardless, and a summary at the end shows what passed and what didn't, so one run surfaces everything wrong instead of one problem at a time. This is slow (mutation testing and e2e are included); reach for the individual `pnpm run validate:*` / `pnpm test` scripts during normal development, and run the full thing before opening a PR.

---

## Pull Requests

Before submitting:

- `pnpm run full-check` passes (or at minimum: tests, lint, and build pass)
- scope is minimal
- changes are well described

---

## Philosophy Reminder

ts-platform is not about adding code.

It is about designing systems that remain simple as they scale.
