import { expect, test } from '@playwright/test'

import { bundlePackageForBrowser } from '../../../e2e/browser/fixtures/bundle-package'
import { startPageServer } from '../../../e2e/browser/fixtures/echo-server'

import type { RunningServer } from '../../../e2e/browser/fixtures/echo-server'
import type { CdmtDrawer } from '../src/components/drawer/drawer.js'
import type { CdmtHeader } from '../src/components/header/header.js'
import type { Page } from '@playwright/test'

declare global {
  interface Window {
    __getDrawer: (id: string) => CdmtDrawer
    __getHeader: (id: string) => CdmtHeader
  }
}

let pageServer: RunningServer

test.beforeAll(async () => {
  const bundle = await bundlePackageForBrowser(new URL('../dist/index.js', import.meta.url))

  const html = `<!doctype html>
<html>
  <body>
    <cdmt-layout id="layout" view="HHH Lpr FFF" style="height: 100vh">
      <cdmt-header id="header" style="height: 64px">header</cdmt-header>
      <cdmt-drawer id="drawer" side="left" width="240">drawer</cdmt-drawer>
      <cdmt-page-container id="page-container">
        <cdmt-page id="page">page content</cdmt-page>
      </cdmt-page-container>
      <cdmt-footer id="footer" style="height: 48px">footer</cdmt-footer>
    </cdmt-layout>
    <cdmt-layout id="docked-layout">
      <cdmt-drawer id="docked-drawer" side="left" width="200">docked drawer</cdmt-drawer>
      <cdmt-page-container id="docked-page-container">docked page</cdmt-page-container>
    </cdmt-layout>
    <script type="module">
      window.__getDrawer = (id) => {
        const el = document.getElementById(id)
        if (!el) throw new Error('expected a drawer with id ' + id)
        return el
      }
      window.__getHeader = (id) => {
        const el = document.getElementById(id)
        if (!el) throw new Error('expected a header with id ' + id)
        return el
      }
    </script>
    <script type="module" src="/bundle.js"></script>
  </body>
</html>`

  pageServer = await startPageServer(html, bundle)
})

test.afterAll(async () => {
  await pageServer.close()
})

// A flat timeout here is unreliable — the CSS transition itself is only
// 150ms, but there can be extra async layers stacked on top (Lit's update
// cycle, <cdmt-layout>'s MutationObserver/ResizeObserver) before the
// transition even starts, and that stack's total latency isn't fixed.
// Polling for the actual settled state is what's robust across environments.
async function waitForTransformSettled(page: Page, elementId: string): Promise<void> {
  await page.waitForFunction((id) => {
    const el = document.getElementById(id)
    return el ? getComputedStyle(el).transform === 'none' : false
  }, elementId)
}

test('a fixed header/footer/drawer offsets the page-container by their real measured size', async ({
  page
}) => {
  await page.goto(pageServer.url)

  await page.evaluate(async () => {
    const drawer = window.__getDrawer('drawer')
    drawer.show()
    await drawer.updateComplete
  })
  await waitForTransformSettled(page, 'drawer')

  const [headerPosition, footerPosition, drawerPosition, padding] = await page.evaluate(() => {
    const header = document.getElementById('header')
    const footer = document.getElementById('footer')
    const drawer = document.getElementById('drawer')
    const container = document.getElementById('page-container')
    if (!header || !footer || !drawer || !container) throw new Error('missing element')

    const style = getComputedStyle(container)
    return [
      getComputedStyle(header).position,
      getComputedStyle(footer).position,
      getComputedStyle(drawer).position,
      { top: style.paddingTop, bottom: style.paddingBottom, left: style.paddingLeft }
    ]
  })

  expect(headerPosition).toBe('fixed')
  expect(footerPosition).toBe('fixed')
  expect(drawerPosition).toBe('fixed')
  expect(padding.top).toBe('64px')
  expect(padding.bottom).toBe('48px')
  expect(padding.left).toBe('240px')
})

test('a docked, non-fixed drawer sits beside the page via flexbox, with no extra padding offset', async ({
  page
}) => {
  await page.goto(pageServer.url)

  await page.evaluate(async () => {
    const drawer = window.__getDrawer('docked-drawer')
    drawer.show()
    await drawer.updateComplete
  })
  await waitForTransformSettled(page, 'docked-drawer')

  const [drawerPosition, drawerRect, pageContainerRect, padding] = await page.evaluate(() => {
    const drawer = document.getElementById('docked-drawer')
    const container = document.getElementById('docked-page-container')
    if (!drawer || !container) throw new Error('missing element')

    return [
      getComputedStyle(drawer).position,
      drawer.getBoundingClientRect(),
      container.getBoundingClientRect(),
      getComputedStyle(container).paddingLeft
    ]
  })

  expect(drawerPosition).toBe('static')
  // flexbox alone placed the page-container right after the drawer's own width
  expect(pageContainerRect.left).toBeCloseTo(drawerRect.left + drawerRect.width, 0)
  expect(padding).toBe('0px')
})

test('closes an overlay drawer by clicking its backdrop, in a real browser', async ({ page }) => {
  await page.goto(pageServer.url)

  await page.evaluate(async () => {
    const drawer = window.__getDrawer('drawer')
    drawer.overlay = true
    drawer.show()
    await drawer.updateComplete
  })
  await waitForTransformSettled(page, 'drawer')

  const isOpenBefore = await page.evaluate(() => window.__getDrawer('drawer').modelValue)
  expect(isOpenBefore).toBe(true)

  await page.mouse.click(700, 400)

  const isOpenAfter = await page.evaluate(() => window.__getDrawer('drawer').modelValue)
  expect(isOpenAfter).toBe(false)
})

test('a header in reveal mode hides on scroll-down and reappears on scroll-up, in a real browser', async ({
  page
}) => {
  await page.goto(pageServer.url)

  await page.evaluate(async () => {
    const header = window.__getHeader('header')
    header.reveal = true
    document.body.style.height = '3000px'
    await header.updateComplete
  })

  await page.mouse.wheel(0, 500)
  await page.waitForFunction(() => {
    const header = window.__getHeader('header')
    return getComputedStyle(header).transform !== 'none'
  })
  const hiddenTransform = await page.evaluate(
    () => getComputedStyle(window.__getHeader('header')).transform
  )

  await page.mouse.wheel(0, -500)
  await waitForTransformSettled(page, 'header')
  const revealedTransform = await page.evaluate(
    () => getComputedStyle(window.__getHeader('header')).transform
  )

  expect(hiddenTransform).not.toBe('none')
  expect(revealedTransform).toBe('none')
})
