import { defineConfig } from 'vitest/config'

import baseConfig from './vitest.config'

// Used only by Stryker (see stryker.config.ts's `vitest.configFile`), never
// by `pnpm test`/`test:coverage` directly. Mutation testing only ever
// mutates `packages/*/*/src` — narrowing `include` to match means Stryker
// doesn't rerun every `scripts/**` test on every single generated mutant for
// no reason, since nothing under `scripts/` is ever mutated.
//
// Plain object spread, not vitest's own `mergeConfig` helper: `mergeConfig`
// concatenates array fields (like `include`) instead of replacing them, so
// it would have kept scripts/**'s pattern right alongside the narrowed one.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['packages/**/src/**/*.{test,spec}.ts']
  }
})
