import type { PartialStrykerOptions } from '@stryker-mutator/api/core'

// `pnpm run test:mutation` (scripts/run-mutation.ts) sets this to the JSON
// array of package dirs Turborepo's dependency graph says are actually
// affected vs. origin/main, for a fast scoped local run — full-check and a
// bare `stryker run` (no env var set) always mutate every package, which is
// what `pnpm run test:mutation:full` and CI (if this is ever added there)
// should use as the ground-truth sweep.
const scopedDirs: string[] = process.env.STRYKER_MUTATE_DIRS
  ? (JSON.parse(process.env.STRYKER_MUTATE_DIRS) as string[])
  : []

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
    ...(scopedDirs.length > 0
      ? scopedDirs.map((dir) => `${dir}/src/**/*.ts`)
      : ['packages/**/src/**/*.ts']),
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
  // against source, not any of this output), and every one of them is
  // actively written by some *other* full-check step that now runs
  // concurrently with this one. Without excluding a path, Stryker's own
  // copy can race that sibling process mid-write and crash with an ENOENT
  // on a file that existed a moment earlier — confirmed directly, twice:
  // first for `coverage`/`dist` (Test (coverage)/Build), then again for
  // `test-results` (Playwright's own output dir for Browser E2E, which
  // also runs concurrently with this step): "ENOENT: no such file or
  // directory, copyfile '...\test-results\...\*.network' ->
  // '...\.stryker-tmp\sandbox-...\test-results\...'". `.stryker-tmp` is
  // this step's own sandbox root and isn't in Stryker's own default
  // ALWAYS_IGNORE list either — without excluding it too, one Stryker run
  // could try to copy a previous run's still-settling sandbox into a new
  // one. The rest (`.turbo`, `.eslintcache`, `.prettiercache`,
  // `playwright-report`, `blob-report`, `reports`) are the same class of
  // risk, added preemptively rather than waiting to hit each one directly:
  // every one of them is written by a step that runs concurrently with
  // Mutation Testing and none of them are ever read by it.
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
  reporters: ['html', 'clear-text', 'progress']
} satisfies PartialStrykerOptions
