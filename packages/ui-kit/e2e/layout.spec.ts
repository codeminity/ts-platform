import { expect, test } from '@playwright/test'

import { bundlePackageForBrowser } from '../../../e2e/browser/fixtures/bundle-package'
import { startPageServer } from '../../../e2e/browser/fixtures/echo-server'

import type { RunningServer } from '../../../e2e/browser/fixtures/echo-server'
import type { CdmtDrawer } from '../src/components/layout/drawer/drawer.js'
import type { CdmtHeader } from '../src/components/layout/header/header.js'
import type { CdmtLayout } from '../src/components/layout/layout.js'
import type { Page } from '@playwright/test'

declare global {
  interface Window {
    __getDrawer: (id: string) => CdmtDrawer
    __getHeader: (id: string) => CdmtHeader
    __getLayout: (id: string) => CdmtLayout
  }
}

let pageServer: RunningServer

test.beforeAll(async () => {
  const bundle = await bundlePackageForBrowser(new URL('../dist/index.js', import.meta.url))

  const html = `<!doctype html>
<html>
  <body>
    <cdmt-layout id="layout" fixed-header fixed-footer fixed-left-drawer style="height: 100vh">
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
    <cdmt-layout id="fixed-header-layout" fixed-header style="height: 100vh">
      <cdmt-header id="fixed-header" style="height: 64px">header</cdmt-header>
      <cdmt-drawer id="fixed-header-drawer" side="left" width="200">drawer under a fixed header</cdmt-drawer>
      <cdmt-page-container id="fixed-header-page-container">
        <div style="height: 3000px">tall page content, tall enough to scroll the drawer's own box back up past the fixed header</div>
      </cdmt-page-container>
    </cdmt-layout>
    <cdmt-layout id="page-height-layout" fixed-header>
      <cdmt-header id="page-height-header" style="height: 64px">header</cdmt-header>
      <cdmt-page-container id="page-height-page-container">
        <cdmt-page id="page-height-page">barely any content</cdmt-page>
      </cdmt-page-container>
      <cdmt-footer id="page-height-footer" style="height: 48px">footer</cdmt-footer>
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
      window.__getLayout = (id) => {
        const el = document.getElementById(id)
        if (!el) throw new Error('expected a layout with id ' + id)
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

// Same reasoning as waitForTransformSettled above, but for a docked drawer's
// width transition, which settles at the given target width rather than at
// a fixed sentinel value like transform's 'none'.
async function waitForWidthSettled(page: Page, elementId: string, targetPx: number): Promise<void> {
  await page.waitForFunction(
    ({ id, targetPx: target }) => {
      const el = document.getElementById(id)
      return el ? el.getBoundingClientRect().width === target : false
    },
    { id: elementId, targetPx }
  )
}

// Same reasoning as waitForTransformSettled/waitForWidthSettled above, but
// for <cdmt-header>/<cdmt-footer>/<cdmt-page-container>'s own left/right/
// padding — also transition-driven now (see CdmtLayout#applyInset's own
// comment), so a JS-driven inline-style change on them doesn't necessarily
// show up in getComputedStyle() synchronously; it interpolates over the
// same duration as the drawer's own transform, just not necessarily on the
// exact same animation frame.
async function waitForCssPxPropertySettled(
  page: Page,
  elementId: string,
  cssProperty: string,
  targetPx: number
): Promise<void> {
  await page.waitForFunction(
    ({ id, cssProperty: property, targetPx: target }) => {
      const el = document.getElementById(id)
      if (!el) return false
      const value = Number.parseFloat(getComputedStyle(el).getPropertyValue(property))
      return Math.abs(value - target) < 0.5
    },
    { id: elementId, cssProperty, targetPx }
  )
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
  await waitForCssPxPropertySettled(page, 'page-container', 'padding-left', 240)

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

test('a fixed header/footer inset themselves by a docked-and-fixed drawer that claims their corner', async ({
  page
}) => {
  await page.goto(pageServer.url)

  await page.evaluate(async () => {
    const layout = window.__getLayout('layout')
    // Drawer claims both left corners instead of the header/footer — the
    // default (headerOverLeftDrawer/footerOverLeftDrawer both true) would
    // have the header/footer claim them instead, with the drawer starting
    // below/above them; this test is specifically about the ceded-corner
    // case, where the header/footer must inset themselves.
    layout.headerOverLeftDrawer = false
    layout.footerOverLeftDrawer = false
    const drawer = window.__getDrawer('drawer')
    drawer.show()
    await Promise.all([layout.updateComplete, drawer.updateComplete])
  })
  await waitForTransformSettled(page, 'drawer')
  await waitForCssPxPropertySettled(page, 'header', 'left', 240)
  await waitForCssPxPropertySettled(page, 'footer', 'left', 240)

  const [headerRect, footerRect, drawerRect] = await page.evaluate(() => {
    const header = document.getElementById('header')
    const footer = document.getElementById('footer')
    const drawer = document.getElementById('drawer')
    if (!header || !footer || !drawer) throw new Error('missing element')
    return [
      header.getBoundingClientRect(),
      footer.getBoundingClientRect(),
      drawer.getBoundingClientRect()
    ]
  })

  // A real regression: header/footer used to always span the full viewport
  // unconditionally whenever fixed, even when a *docked*-and-fixed drawer
  // (which, unlike a temporary mobile overlay, stays visible for as long as
  // the layout is mounted) occupies that same left region and has been told
  // to claim that corner — permanently hiding the header/footer's own
  // content underneath it.
  expect(headerRect.left).toBeCloseTo(drawerRect.width, 0)
  expect(footerRect.left).toBeCloseTo(drawerRect.width, 0)
})

test('a docked-and-fixed drawer spans the full viewport height when it claims both header and footer corners', async ({
  page
}) => {
  await page.goto(pageServer.url)

  const [drawerRect, viewportHeight] = await page.evaluate(async () => {
    const layout = window.__getLayout('layout')
    layout.headerOverLeftDrawer = false
    layout.footerOverLeftDrawer = false
    const drawer = window.__getDrawer('drawer')
    drawer.show()
    await Promise.all([layout.updateComplete, drawer.updateComplete])
    return [drawer.getBoundingClientRect(), window.innerHeight]
  })

  // The exact "sidebar spans edge to edge; header/footer only occupy the
  // remaining width" layout confirmed directly against a real, deliberately
  // extreme case (header, footer, and drawer all fixed at once, with the
  // drawer claiming both corners) — the standard shape for a permanent
  // desktop sidebar, distinct from the *default* (header/footer claim their
  // own corners, drawer starts below/above them) covered by the previous
  // test.
  expect(drawerRect.top).toBe(0)
  expect(drawerRect.height).toBeCloseTo(viewportHeight, 0)
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

  // 'relative', not 'static' — :host is always position:relative (a docked
  // drawer just never gets the position:fixed override), so its own
  // absolutely-positioned content wrappers have a real containing block.
  expect(drawerPosition).toBe('relative')
  // flexbox alone placed the page-container right after the drawer's own width
  expect(pageContainerRect.left).toBeCloseTo(drawerRect.left + drawerRect.width, 0)
  expect(padding).toBe('0px')
})

test('a docked drawer starts below a fixed header, not underneath it', async ({ page }) => {
  await page.goto(pageServer.url)

  const [headerRect, drawerRect, drawerPosition] = await page.evaluate(() => {
    const header = document.getElementById('fixed-header')
    const drawer = document.getElementById('fixed-header-drawer')
    if (!header || !drawer) throw new Error('missing element')

    // This fixture isn't the first thing on the page, so it starts scrolled
    // out of view — its own fixed header still renders pinned to the true
    // viewport (fixed positioning ignores which <cdmt-layout> "owns" it),
    // but a docked (non-fixed) drawer needs scrolling into view to compare
    // sanely.
    document.getElementById('fixed-header-layout')?.scrollIntoView()

    return [
      header.getBoundingClientRect(),
      drawer.getBoundingClientRect(),
      getComputedStyle(drawer).position
    ]
  })

  // 'relative', not 'static' — see the other docked-drawer test above.
  expect(drawerPosition).toBe('relative')
  expect(drawerRect.top).toBeCloseTo(headerRect.bottom, 0)
})

test('a docked, non-fixed drawer has an explicit z-index, so it can never paint above a fixed sibling header', async ({
  page
}) => {
  await page.goto(pageServer.url)

  // Guards the actual root cause directly: a docked (non-fixed) drawer must
  // have an *explicit* z-index, not the CSS default `auto` — confirmed via
  // this repo's real ui-kit-docs app (a coordinate-based hit-test isn't
  // reproducible reliably in this shared fixture page, which stacks several
  // <cdmt-layout>s — each with its own `position: fixed` header competing
  // for the same on-screen coordinates) that with it left at `auto`, the
  // drawer painted *above* a sibling `position: fixed` header once scrolled
  // far enough for the drawer's own tall box to reach the header's screen
  // position, hiding the header's own content (confirmed directly via
  // document.elementFromPoint, before the fix).
  const drawerZIndex = await page.evaluate(() => {
    const drawer = document.getElementById('fixed-header-drawer')
    if (!drawer) throw new Error('missing element')
    return getComputedStyle(drawer).zIndex
  })

  expect(drawerZIndex).not.toBe('auto')
})

test('a page with barely any content does not overflow its layout when the header is fixed but the footer is docked', async ({
  page
}) => {
  await page.goto(pageServer.url)

  // A real regression: <cdmt-page>'s own `min-height` used to be
  // `calc(100vh - fixedHeaderHeight - fixedFooterHeight)` — correct only
  // when header/footer are *both* fixed (taken fully out of flow). Here
  // the footer is docked (fixed-footer not set) — it still consumes its
  // own real 48px as a genuine flex sibling of the page-container, on top
  // of whatever the page itself fills, which that calc() never accounted
  // for (a docked header/footer's own `--cdmt-layout-*-height` var is 0,
  // since that var is deliberately fixed-only). The layout's own
  // `min-height: 100vh` (no explicit height here, so it's free to grow
  // past that floor) overflowed the true viewport height by the footer's
  // real height, even though the page had almost no content — confirmed
  // directly, before the fix.
  const [layoutHeight, viewportHeight] = await page.evaluate(() => {
    const layout = document.getElementById('page-height-layout')
    if (!layout) throw new Error('missing element')
    return [layout.getBoundingClientRect().height, window.innerHeight]
  })

  expect(layoutHeight).toBeCloseTo(viewportHeight, 0)
})

test('an overlay drawer spans the full viewport height, ignoring a fixed header', async ({
  page
}) => {
  await page.goto(pageServer.url)

  const [panelRect, viewportHeight] = await page.evaluate(async () => {
    const drawer = window.__getDrawer('drawer')
    drawer.overlay = true
    drawer.show()
    await drawer.updateComplete
    // The host itself is a zero-footprint wrapper in overlay mode (see
    // drawer.styles.ts's own comment on why) — .cdmt-drawer__panel is the
    // element that's actually position:fixed and visible.
    const panel = drawer.shadowRoot?.querySelector('.cdmt-drawer__panel')
    if (!panel) throw new Error('missing panel')
    return [panel.getBoundingClientRect(), window.innerHeight]
  })

  // Unlike a docked drawer sitting beside a fixed header (which correctly
  // offsets below it), an overlay drawer is a full-screen-style cover — it
  // must span the whole viewport, not start below the header's 64px.
  expect(panelRect.top).toBe(0)
  expect(panelRect.height).toBeCloseTo(viewportHeight, 0)
})

test('a docked drawer collapses its width to 0 when hidden, and page-container reflows to reclaim the space', async ({
  page
}) => {
  await page.goto(pageServer.url)

  const collapsedRect = await page.evaluate(() => {
    const drawer = document.getElementById('docked-drawer')
    if (!drawer) throw new Error('missing element')
    return drawer.getBoundingClientRect()
  })
  expect(collapsedRect.width).toBe(0)

  await page.evaluate(async () => {
    const drawer = window.__getDrawer('docked-drawer')
    drawer.show()
    await drawer.updateComplete
  })
  await waitForWidthSettled(page, 'docked-drawer', 200)

  const [openRect, openPageContainerRect] = await page.evaluate(() => {
    const drawer = document.getElementById('docked-drawer')
    const container = document.getElementById('docked-page-container')
    if (!drawer || !container) throw new Error('missing element')
    return [drawer.getBoundingClientRect(), container.getBoundingClientRect()]
  })
  expect(openRect.width).toBe(200)
  expect(openPageContainerRect.left).toBeCloseTo(openRect.left + openRect.width, 0)

  await page.evaluate(async () => {
    const drawer = window.__getDrawer('docked-drawer')
    drawer.hide()
    await drawer.updateComplete
  })
  await waitForWidthSettled(page, 'docked-drawer', 0)

  const reCollapsedRect = await page.evaluate(() => {
    const drawer = document.getElementById('docked-drawer')
    if (!drawer) throw new Error('missing element')
    return drawer.getBoundingClientRect()
  })
  expect(reCollapsedRect.width).toBe(0)
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

test('slotted content inside an open overlay drawer stays clickable, not intercepted by its own backdrop', async ({
  page
}) => {
  await page.goto(pageServer.url)

  await page.evaluate(async () => {
    const drawer = window.__getDrawer('drawer')
    drawer.overlay = true
    drawer.innerHTML = '<button id="drawer-btn">inside drawer</button>'
    drawer.show()
    await drawer.updateComplete
  })
  await waitForTransformSettled(page, 'drawer')

  const buttonCenter = await page.evaluate(() => {
    const rect = document.getElementById('drawer-btn')?.getBoundingClientRect()
    if (!rect) throw new Error('expected #drawer-btn to exist')
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  })
  // A direct coordinate click (not page.click, which would hang retrying
  // actionability checks) mirrors the backdrop-click test above — if the
  // backdrop were still stacked above the drawer's own content, this would
  // hit the backdrop instead and close the drawer.
  await page.mouse.click(buttonCenter.x, buttonCenter.y)

  const stillOpen = await page.evaluate(() => window.__getDrawer('drawer').modelValue)
  expect(stillOpen).toBe(true)
})

test('a docked-and-fixed drawer does not leave an invisible backdrop blocking clicks on the rest of the page', async ({
  page
}) => {
  await page.goto(pageServer.url)

  await page.evaluate(async () => {
    const drawer = window.__getDrawer('drawer')
    drawer.show()
    await drawer.updateComplete
  })
  await waitForTransformSettled(page, 'drawer')

  // A real regression: `#isBackdropVisible` checked `modelValue && #isFixed`
  // only, missing the same `&& !isDocked` distinction `data-cdmt-overlay-fixed`
  // already used — `#isFixed` is also true for a *docked*-and-fixed drawer
  // (a permanent sidebar, via `fixed-left-drawer`), not just a genuine
  // temporary overlay. That left the backdrop's `--visible` class applied
  // (opacity 0, but `pointer-events: auto`, `position: fixed; inset: 0`,
  // spanning the *entire* viewport) for as long as this permanently-docked
  // drawer stayed open — forever — silently swallowing every click on the
  // rest of the page, not just clicks over the drawer itself.
  const [isDocked, backdrop] = await page.evaluate(() => {
    const drawer = window.__getDrawer('drawer')
    const backdropEl = drawer.shadowRoot?.querySelector('.cdmt-drawer__backdrop')
    if (!backdropEl) throw new Error('expected a backdrop element')
    const style = getComputedStyle(backdropEl)
    return [
      drawer.isDocked,
      {
        pointerEvents: style.pointerEvents,
        hasVisibleClass: backdropEl.classList.contains('cdmt-drawer__backdrop--visible')
      }
    ]
  })

  expect(isDocked).toBe(true)
  expect(backdrop.hasVisibleClass).toBe(false)
  expect(backdrop.pointerEvents).toBe('none')
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
