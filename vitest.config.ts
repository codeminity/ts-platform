import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.{test,spec}.ts', 'scripts/validate-api.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/**/src/**/*'],
      exclude: ['**/*.d.ts', '**/node_modules/**']
    }
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './packages')
    }
  }
})
