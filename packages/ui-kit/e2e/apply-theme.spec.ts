import { expect, test } from '@playwright/test'

import { bundlePackageForBrowser } from '../../../e2e/browser/fixtures/bundle-package'
import { startPageServer } from '../../../e2e/browser/fixtures/echo-server'

import type { RunningServer } from '../../../e2e/browser/fixtures/echo-server'
import type { getThemeController, material, mergeTheme } from '../src/index.js'

declare global {
  interface Window {
    __uikit: {
      getThemeController: typeof getThemeController
      material: typeof material
      mergeTheme: typeof mergeTheme
    }
    __getShadowButton: (hostSelector: string) => HTMLButtonElement
    __getShadowInput: (hostSelector: string) => HTMLInputElement
  }
}

let pageServer: RunningServer

test.beforeAll(async () => {
  const bundle = await bundlePackageForBrowser(new URL('../dist/index.js', import.meta.url))

  const html = `<!doctype html>
<html>
  <body>
    <cdmt-button id="btn" variant="primary">Save</cdmt-button>
    <cdmt-input id="inp" invalid></cdmt-input>
    <script type="module">
      import { getThemeController, material, mergeTheme } from '/bundle.js'
      window.__uikit = { getThemeController, material, mergeTheme }

      window.__getShadowButton = (hostSelector) => {
        const host = document.querySelector(hostSelector)
        const button = host && host.shadowRoot && host.shadowRoot.querySelector('button')
        if (!button) throw new Error('expected a <button> in ' + hostSelector + "'s shadow root")
        return button
      }

      window.__getShadowInput = (hostSelector) => {
        const host = document.querySelector(hostSelector)
        const input = host && host.shadowRoot && host.shadowRoot.querySelector('input')
        if (!input) throw new Error('expected an <input> in ' + hostSelector + "'s shadow root")
        return input
      }
    </script>
  </body>
</html>`

  pageServer = await startPageServer(html, bundle)
})

test.afterAll(async () => {
  await pageServer.close()
})

test('applyTheme (via getThemeController) resolves real computed colors on a live button', async ({
  page
}) => {
  await page.goto(pageServer.url)

  const bg = await page.evaluate(
    () => getComputedStyle(window.__getShadowButton('#btn')).backgroundColor
  )

  // material.tokens.colors.primary.light.value === '#4f46e5'
  expect(bg).toBe('rgb(79, 70, 229)')
})

test('toggleMode() re-paints an already-rendered button live, in a real browser', async ({
  page
}) => {
  await page.goto(pageServer.url)

  const before = await page.evaluate(
    () => getComputedStyle(window.__getShadowButton('#btn')).backgroundColor
  )
  await page.evaluate(() => {
    window.__uikit.getThemeController().toggleMode()
  })
  const after = await page.evaluate(
    () => getComputedStyle(window.__getShadowButton('#btn')).backgroundColor
  )

  // material.tokens.colors.primary.dark.value === '#818cf8'
  expect(before).toBe('rgb(79, 70, 229)')
  expect(after).toBe('rgb(129, 140, 248)')
})

test('setTheme() with a mergeTheme() override changes a color role live, including its own onHover/foreground', async ({
  page
}) => {
  await page.goto(pageServer.url)

  await page.evaluate(() => {
    const { getThemeController, material, mergeTheme } = window.__uikit
    const controller = getThemeController()
    controller.setTheme(
      mergeTheme(material, {
        colors: { primary: { light: { value: '#e11d48', foreground: '#000000' } } }
      })
    )
  })

  const [bg, color] = await page.evaluate(() => {
    const style = getComputedStyle(window.__getShadowButton('#btn'))
    return [style.backgroundColor, style.color]
  })

  expect(bg).toBe('rgb(225, 29, 72)')
  expect(color).toBe('rgb(0, 0, 0)')
})

test('an invalid cdmt-input border reflects colorNegative independently of a primary-color override', async ({
  page
}) => {
  await page.goto(pageServer.url)

  await page.evaluate(() => {
    const { getThemeController, material, mergeTheme } = window.__uikit
    getThemeController().setTheme(
      mergeTheme(material, { colors: { primary: { light: { value: '#000000' } } } })
    )
  })

  const borderColor = await page.evaluate(
    () => getComputedStyle(window.__getShadowInput('#inp')).borderColor
  )

  // material.tokens.colors.negative.light.value === '#dc2626', unaffected by the primary override above
  expect(borderColor).toBe('rgb(220, 38, 38)')
})
