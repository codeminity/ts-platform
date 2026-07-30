import type { PartialStrykerOptions } from '@stryker-mutator/api/core'

// Mirrors vitest.config.ts's own coverage `include`/`exclude` shape, so any
// production file that counts toward the 100% coverage requirement is also
// mutation-tested — new packages/files need zero config changes here.
export default {
  mutate: [
    'packages/*/*/src/**/*.ts',
    '!packages/*/*/src/**/*.test.ts',
    '!packages/*/*/src/**/*.spec.ts',
    '!packages/*/*/src/**/*.d.ts',
    '!packages/*/*/src/**/index.ts',
    '!packages/*/*/src/**/*.interface.ts',
    '!packages/*/*/src/**/*.type.ts',
    '!packages/*/*/src/**/mocks/**'
  ],
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  vitest: {
    configFile: 'vitest.config.ts',
    // Vitest's related-file lookup can't resolve mutated files back to their
    // tests in this pnpm workspace (see Stryker's vitest-runner troubleshooting
    // guide) — disabling it just runs the full configured suite once for the
    // dry run instead; per-mutant reruns still stay scoped via the
    // runtime-tracked `perTest` coverage analysis, unaffected by this.
    related: false
  },
  reporters: ['html', 'clear-text', 'progress']
} satisfies PartialStrykerOptions
