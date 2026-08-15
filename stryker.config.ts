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
