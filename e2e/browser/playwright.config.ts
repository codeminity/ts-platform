import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '../..',
  testMatch: 'packages/**/e2e/**/*.spec.ts',
  // A leftover `.stryker-tmp/sandbox-*` from a prior failed mutation-testing
  // run contains its own full copy of every package (including e2e specs) —
  // without this, testMatch's `**` happily discovers and runs those too.
  testIgnore: '**/.stryker-tmp/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
