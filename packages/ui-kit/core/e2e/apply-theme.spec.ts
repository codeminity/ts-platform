import { expect, test } from '@playwright/test'

import { bundlePackageForBrowser } from '../../../../e2e/browser/fixtures/bundle-package'
import { startPageServer } from '../../../../e2e/browser/fixtures/echo-server'

import type { RunningServer } from '../../../../e2e/browser/fixtures/echo-server'

declare global {
  interface Window {
    __theme: {
      applyTheme: (target: HTMLElement, preset: unknown, mode?: 'light' | 'dark') => void
      mergeTheme: (base: unknown, overrides: unknown) => unknown
      material: unknown
    }
  }
}

let pageServer: RunningServer

test.beforeAll(async () => {
  const bundle = await bundlePackageForBrowser(new URL('../dist/index.js', import.meta.url))

  // Real happy-dom-based unit tests (apply-theme.test.ts) cannot catch this
  // class of bug: happy-dom's getComputedStyle does not resolve CSS custom
  // property inheritance/var() fallbacks the way a real browser does — this
  // exact regression (applyTheme having zero visible effect, see
  // DECISIONS.md#adr-006) shipped past every happy-dom test green. Only a
  // real rendered page proves the theme actually reaches the pixel.
  const html = `<!doctype html>
<html>
  <body>
    <cdmt-button id="btn" variant="primary">Click me</cdmt-button>
    <cdmt-input id="inp" invalid></cdmt-input>
    <script type="module">
      import { applyTheme, mergeTheme, material } from '/bundle.js'
      window.__theme = { applyTheme, mergeTheme, material }
    </script>
  </body>
</html>`

  pageServer = await startPageServer(html, bundle)
})

test.afterAll(async () => {
  await pageServer.close()
})

test('applyTheme changes an already-rendered cdmt-button real computed background color', async ({
  page
}) => {
  await page.goto(pageServer.url, { waitUntil: 'networkidle' })

  const before = await page.evaluate(() => {
    const inner = document.getElementById('btn')?.shadowRoot?.querySelector('button')
    return inner ? getComputedStyle(inner).backgroundColor : null
  })

  await page.evaluate(() => {
    const { applyTheme, mergeTheme, material } = window.__theme
    const custom = mergeTheme(material, { tokens: { colorPrimary: 'rgb(0, 255, 0)' } })
    applyTheme(document.documentElement, custom, 'light')
  })

  const after = await page.evaluate(() => {
    const inner = document.getElementById('btn')?.shadowRoot?.querySelector('button')
    return inner ? getComputedStyle(inner).backgroundColor : null
  })

  expect(after).toBe('rgb(0, 255, 0)')
  expect(after).not.toBe(before)
})

test('applyTheme re-applied with a merged override changes both color and radius', async ({
  page
}) => {
  await page.goto(pageServer.url, { waitUntil: 'networkidle' })

  await page.evaluate(() => {
    const { applyTheme, mergeTheme, material } = window.__theme
    const custom = mergeTheme(material, {
      tokens: { colorPrimary: 'rgb(255, 0, 128)', radiusMd: '20px' }
    })
    applyTheme(document.documentElement, custom, 'dark')
  })

  const result = await page.evaluate(() => {
    const inner = document.getElementById('btn')?.shadowRoot?.querySelector('button')
    if (!inner) return null
    const style = getComputedStyle(inner)
    return { backgroundColor: style.backgroundColor, borderRadius: style.borderRadius }
  })

  expect(result).toEqual({ backgroundColor: 'rgb(255, 0, 128)', borderRadius: '20px' })
})

test('applyTheme changes an invalid cdmt-input border color via colorDanger, live', async ({
  page
}) => {
  await page.goto(pageServer.url, { waitUntil: 'networkidle' })

  const before = await page.evaluate(() => {
    const inner = document.getElementById('inp')?.shadowRoot?.querySelector('input')
    return inner ? getComputedStyle(inner).borderColor : null
  })

  await page.evaluate(() => {
    const { applyTheme, mergeTheme, material } = window.__theme
    const custom = mergeTheme(material, { tokens: { colorDanger: 'rgb(255, 0, 255)' } })
    applyTheme(document.documentElement, custom, 'light')
  })

  const after = await page.evaluate(() => {
    const inner = document.getElementById('inp')?.shadowRoot?.querySelector('input')
    return inner ? getComputedStyle(inner).borderColor : null
  })

  expect(after).toBe('rgb(255, 0, 255)')
  expect(after).not.toBe(before)
})
