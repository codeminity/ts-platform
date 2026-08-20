import type { PartialStrykerOptions } from '@stryker-mutator/api/core'

// Deliberately narrower than vitest.config.ts's own coverage include/exclude:
// this mutates every *published* package's production code — the code an
// external consumer actually depends on — not scripts/ (this repo's own
// build/release/validation tooling). See DECISIONS.md#adr-007-mutation-testing-scope
// for why that line is intentional, not an oversight.
export default {
  mutate: [
    // `**` (not `*/*`) so a one-level-deep package (e.g. `packages/ui-kit`)
    // is found the same as a two-level one (`packages/request/axios`).
    // Stryker's own file reader always ignores `node_modules` regardless of
    // this config (see `ALWAYS_IGNORE` in `@stryker-mutator/core`'s
    // `project-reader.ts`), so — unlike some of the other globs broadened
    // for this same reason across the repo — no explicit exclusion is
    // needed or wanted here (an explicit one that excludes nothing just
    // produces its own "did not exclude any files" warning).
    'packages/**/src/**/*.ts',
    '!packages/**/src/**/*.test.ts',
    '!packages/**/src/**/index.ts',
    '!packages/**/src/**/*.interface.ts',
    '!packages/**/src/**/*.type.ts',
    '!packages/**/src/**/mocks/**',
    '!packages/**/src/**/test-utils.ts'
  ],
  // See DECISIONS.md#adr-011-static-mutants-ignored-in-mutation-testing —
  // also means a purely static file (e.g. theme/tokens.ts) will show 0
  // total mutants in the report; that's expected, not a coverage gap.
  ignoreStatic: true,
  // Stryker's sandbox setup copies the whole project directory as-is; none
  // of these generated/gitignored paths are needed (mutation testing runs
  // against source, not any of this output). Originally added because
  // mutation testing used to run as a `full-check` step concurrently with
  // Build/Test (coverage)/Browser E2E, whose own output directories it
  // would otherwise race mid-write and crash with an ENOENT on a file that
  // existed a moment earlier — confirmed directly, twice: first for
  // `coverage`/`dist` (Test (coverage)/Build), then again for
  // `test-results` (Playwright's own output dir for Browser E2E): "ENOENT:
  // no such file or directory, copyfile '...\test-results\...\*.network' ->
  // '...\.stryker-tmp\sandbox-...\test-results\...'". Mutation testing now
  // runs standalone in its own nightly CI workflow (DECISIONS.md ADR-017),
  // not concurrently with anything else, but every one of these paths is
  // still never read by it and copying them into the sandbox is still pure
  // waste, so the exclusions stay. `.stryker-tmp` is this step's own
  // sandbox root and isn't in Stryker's own default ALWAYS_IGNORE list
  // either — without excluding it too, one Stryker run could try to copy a
  // previous run's still-settling sandbox into a new one.
  ignorePatterns: [
    'coverage',
    'dist',
    'test-results',
    '.stryker-tmp',
    '.turbo',
    '.eslintcache',
    '.prettiercache',
    'playwright-report',
    'blob-report',
    'reports'
  ],
  // Stryker's own default is `{ high: 80, low: 60, break: null }` — with
  // `break` unset, it never exits non-zero no matter how low the score
  // gets, so `pnpm run test:mutation` silently "passed" even on a real
  // regression. This repo's bar is 100% (same as `test:coverage`'s
  // thresholds in vitest.config.ts) — confirmed missing, not a deliberate
  // gap.
  thresholds: { high: 100, low: 100, break: 100 },
  // Stryker's default bails a mutant's test run at the first failing test,
  // so `killedBy` normally reflects one arbitrary test, not every test
  // that would independently kill it — confirmed directly: a genuinely
  // essential test can end up with an empty `killedBy` purely because some
  // unrelated test happened to run first and already failed. Without this,
  // `scripts/find-redundant-tests.ts` (run nightly right after mutation
  // testing) would misidentify load-bearing tests as redundant.
  //
  // Does change the real running time, though — a mutant covered by many
  // tests (e.g. one exercised by every test in an *.integration.test.ts
  // file) must now run every one of them to completion instead of
  // stopping at the first failure. Confirmed directly on GitHub Actions'
  // slower/shared runners: the default timeout budget (timeoutFactor 1.5,
  // timeoutMS 5000) wasn't enough headroom for that extra work, producing
  // 14 real Timeouts (not Survived — just genuinely too slow under the new
  // budget) and a 99.93% score that had nothing to do with an actual
  // regression. See timeoutFactor/timeoutMS below.
  disableBail: true,
  // Bumped from Stryker's defaults (1.5 / 5000) specifically to give
  // disableBail's extra per-mutant work enough room on a slower CI runner
  // — see disableBail's own comment above for the false-timeout incident
  // this fixes. Nightly-only and not time-critical, so generous headroom
  // costs nothing real.
  timeoutFactor: 4,
  timeoutMS: 30_000,
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  vitest: {
    // A dedicated config (not vitest.config.ts) scoped to packages/**/src
    // tests only — see vitest.mutation.config.ts. Nothing under scripts/ is
    // ever mutated, so there's no reason for its ~20 test files to rerun on
    // every single generated mutant.
    configFile: 'vitest.mutation.config.ts',
    // Vitest's related-file lookup can't resolve mutated files back to their
    // tests in this pnpm workspace (see Stryker's vitest-runner troubleshooting
    // guide) — disabling it just runs the full configured suite once for the
    // dry run instead; per-mutant reruns still stay scoped via the
    // runtime-tracked `perTest` coverage analysis, unaffected by this.
    related: false
  },
  // 'json' feeds `scripts/find-redundant-tests.ts`, run nightly right after
  // this — it needs the report's per-mutant killedBy/coveredBy test
  // attribution, which only the json reporter (not html/clear-text/
  // progress) writes to disk.
  reporters: ['html', 'clear-text', 'progress', 'json']
} satisfies PartialStrykerOptions
