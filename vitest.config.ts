import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // Default — most packages here are Node-oriented request/auth logic
    // with no DOM. ui-kit's Web Component tests are the deliberate
    // exception: they opt into `happy-dom` per file via a
    // `// @vitest-environment happy-dom` comment (Vitest 4 dropped
    // `environmentMatchGlobs`; this is the still-supported per-file
    // mechanism) — see DECISIONS.md#adr-010.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['packages/**/src/**/*.{test,spec}.ts', 'scripts/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/**/src/**/*.{ts,js}', 'scripts/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        '**/node_modules/**',
        '**/index.ts',
        '**/test-utils.ts',
        '**/*.interface.ts',
        '**/*.type.ts',
        '**/mocks/**',
        'scripts/**/*-run.ts'
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100
      }
    },

    reporters: ['dot'],

    benchmark: {
      include: ['packages/**/bench/*.bench.ts'],
      exclude: ['**/node_modules/**', '**/dist/**']
    }
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './packages')
    }
  }
})
