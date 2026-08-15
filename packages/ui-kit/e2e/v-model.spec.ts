import { expect, test } from '@playwright/test'

import { bundlePackageForBrowser } from '../../../e2e/browser/fixtures/bundle-package'
import { startPageServer } from '../../../e2e/browser/fixtures/echo-server'

import type { RunningServer } from '../../../e2e/browser/fixtures/echo-server'

let pageServer: RunningServer

test.beforeAll(async () => {
  // Bundles Vue + ui-kit + the Vue binding together from a real app entry
  // point, mirroring a real consumer's own bundler — not just importing
  // ui-kit's own already-built dist/vue/index.js in isolation.
  const bundle = await bundlePackageForBrowser(
    new URL('./fixtures/vue-app-entry.ts', import.meta.url)
  )

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
  await page.goto(pageServer.url)

  const input = page.locator('#target-input').locator('input')
  await input.click()
  await page.keyboard.type('user@example.com')

  await expect(page.locator('#echo')).toHaveText('user@example.com')
  await expect(input).toHaveValue('user@example.com')
})

test('CdmtButton forwards a plain @click with no wrapper-side translation', async ({ page }) => {
  await page.goto(pageServer.url)

  const button = page.locator('#target-button').locator('button')
  await button.click()
  await button.click()

  await expect(page.locator('#click-count')).toHaveText('2')
})

test('createUIKit() applies the default theme before the app mounts, live in a real browser', async ({
  page
}) => {
  await page.goto(pageServer.url)

  const bg = await page.evaluate(() => {
    const host = document.querySelector('#target-button')
    const button = host?.shadowRoot?.querySelector('button')
    if (!button) throw new Error("expected a <button> in #target-button's shadow root")
    return getComputedStyle(button).backgroundColor
  })

  expect(bg).toBe('rgb(79, 70, 229)')
})
