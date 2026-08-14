import { expect, test } from '@playwright/test'

import { bundlePackageForBrowser } from '../../../../e2e/browser/fixtures/bundle-package'
import { startPageServer } from '../../../../e2e/browser/fixtures/echo-server'

import type { RunningServer } from '../../../../e2e/browser/fixtures/echo-server'

let pageServer: RunningServer

test.beforeAll(async () => {
  // Bundles Vue + ui-kit-core + ui-kit-vue together, exactly like a real
  // consuming app's own bundler would — proves the whole chain works, not
  // just this package's isolated exports. Unit tests (CdmtInput.test.ts)
  // cover component logic; this proves real keyboard input, through a real
  // custom element's shadow DOM, actually reaches a Vue ref via v-model.
  const bundle = await bundlePackageForBrowser(new URL('./fixtures/app-entry.ts', import.meta.url))

  const html = `<!doctype html>
<html>
  <body>
    <div id="app"></div>
    <script type="module" src="/bundle.js"></script>
  </body>
</html>`

  pageServer = await startPageServer(html, bundle)
})

test.afterAll(async () => {
  await pageServer.close()
})

test('v-model on CdmtInput tracks real keyboard input through the shadow DOM', async ({ page }) => {
  await page.goto(pageServer.url, { waitUntil: 'networkidle' })

  await page.click('#target-input')
  await page.keyboard.type('user@example.com')

  await expect(page.locator('#echo')).toHaveText('user@example.com')

  const innerValue = await page.evaluate(() => {
    const el = document.getElementById('target-input')
    return el?.shadowRoot?.querySelector('input')?.value
  })

  expect(innerValue).toBe('user@example.com')
})

test('CdmtButton forwards a plain @click with no wrapper-side translation', async ({ page }) => {
  await page.goto(pageServer.url, { waitUntil: 'networkidle' })

  await page.click('#target-button')
  await page.click('#target-button')

  await expect(page.locator('#click-count')).toHaveText('2')
})
