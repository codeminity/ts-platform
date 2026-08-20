// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import './drawer/drawer.js'
import './footer/footer.js'
import './header/header.js'
import './page-container/page-container.js'

import { CdmtLayout } from './layout.js'

function required<T>(value: T | null | undefined, message: string): T {
  if (value == null) throw new Error(message)
  return value
}

// happy-dom has no real layout engine — getBoundingClientRect() always
// returns all-zero values here, so these tests verify the *gating* logic
// (is a measurement even attempted for a given element, and does the right
// number end up on the right CSS var) rather than actual pixel values,
// which is instead covered by a real-browser e2e spec.
function stubRect(element: Element, size: number): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    height: size,
    width: size,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    x: 0,
    y: 0,
    toJSON: () => ({})
  })
}

async function mountLayout(innerHTML: string): Promise<CdmtLayout> {
  const el = document.createElement('cdmt-layout')
  el.innerHTML = innerHTML
  document.body.append(el)
  await el.updateComplete
  // Child auto-slotting/measurement is driven by a MutationObserver
  // callback, which runs as a microtask — flush it before asserting.
  await Promise.resolve()
  await Promise.resolve()
  return el
}

describe(CdmtLayout, () => {
  let el: CdmtLayout

  beforeEach(async () => {
    el = await mountLayout('')
  })

  afterEach(() => {
    el.remove()
  })

  it('defaults every fixed-* flag to false, every *-over-drawer-* flag to true, and container to false', () => {
    expect(el.fixedHeader).toBe(false)
    expect(el.fixedFooter).toBe(false)
    expect(el.fixedLeftDrawer).toBe(false)
    expect(el.fixedRightDrawer).toBe(false)
    expect(el.headerOverLeftDrawer).toBe(true)
    expect(el.headerOverRightDrawer).toBe(true)
    expect(el.footerOverLeftDrawer).toBe(true)
    expect(el.footerOverRightDrawer).toBe(true)
    expect(el.container).toBe(false)
    expect(el.transitionDuration).toBeUndefined()
  })

  it('leaves --cdmt-layout-transition-duration unset by default', () => {
    expect(el.style.getPropertyValue('--cdmt-layout-transition-duration')).toBe('')
  })

  it('sets --cdmt-layout-transition-duration when transitionDuration is set', async () => {
    el.transitionDuration = '300ms'
    await el.updateComplete

    expect(el.style.getPropertyValue('--cdmt-layout-transition-duration')).toBe('300ms')
  })

  it('reflects transitionDuration as the transition-duration attribute', async () => {
    el.transitionDuration = '1s'
    await el.updateComplete

    expect(el.getAttribute('transition-duration')).toBe('1s')
  })

  it('removes --cdmt-layout-transition-duration when transitionDuration is cleared', async () => {
    el.transitionDuration = '300ms'
    await el.updateComplete

    el.transitionDuration = undefined
    await el.updateComplete

    expect(el.style.getPropertyValue('--cdmt-layout-transition-duration')).toBe('')
  })

  it('does not touch --cdmt-layout-transition-duration when an unrelated property changes', async () => {
    el.transitionDuration = '300ms'
    await el.updateComplete
    const setSpy = vi.spyOn(el.style, 'setProperty')

    el.container = true
    await el.updateComplete

    expect(setSpy).not.toHaveBeenCalledWith('--cdmt-layout-transition-duration', expect.anything())
  })

  it('reflects every boolean flag as its own kebab-case attribute', async () => {
    el.fixedHeader = true
    el.fixedFooter = true
    el.fixedLeftDrawer = true
    el.fixedRightDrawer = true
    el.headerOverLeftDrawer = false
    el.headerOverRightDrawer = false
    el.footerOverLeftDrawer = false
    el.footerOverRightDrawer = false
    el.container = true
    await el.updateComplete

    expect(el.hasAttribute('fixed-header')).toBe(true)
    expect(el.hasAttribute('fixed-footer')).toBe(true)
    expect(el.hasAttribute('fixed-left-drawer')).toBe(true)
    expect(el.hasAttribute('fixed-right-drawer')).toBe(true)
    expect(el.hasAttribute('header-over-left-drawer')).toBe(false)
    expect(el.hasAttribute('header-over-right-drawer')).toBe(false)
    expect(el.hasAttribute('footer-over-left-drawer')).toBe(false)
    expect(el.hasAttribute('footer-over-right-drawer')).toBe(false)
    expect(el.hasAttribute('container')).toBe(true)
  })

  it('auto-routes a header, footer, and page-container to their named slots by tag name', async () => {
    const layout = await mountLayout(
      '<cdmt-header></cdmt-header><cdmt-page-container></cdmt-page-container><cdmt-footer></cdmt-footer>'
    )

    expect(layout.querySelector('cdmt-header')?.slot).toBe('header')
    expect(layout.querySelector('cdmt-page-container')?.slot).toBe('page-container')
    expect(layout.querySelector('cdmt-footer')?.slot).toBe('footer')

    layout.remove()
  })

  it('routes a left-side drawer to drawer-left and a right-side drawer to drawer-right', async () => {
    const layout = await mountLayout(
      '<cdmt-drawer side="left"></cdmt-drawer><cdmt-drawer side="right"></cdmt-drawer>'
    )

    const drawers = [...layout.querySelectorAll('cdmt-drawer')]

    expect(drawers.find((d) => d.side === 'left')?.slot).toBe('drawer-left')
    expect(drawers.find((d) => d.side === 'right')?.slot).toBe('drawer-right')

    layout.remove()
  })

  it('leaves an unrecognized child unrouted (falls through to the default slot)', async () => {
    const layout = await mountLayout('<div id="misc"></div>')

    expect(layout.querySelector('#misc')?.slot).toBe('')

    layout.remove()
  })

  it('marks header/footer fixed from fixedHeader/fixedFooter', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header><cdmt-footer></cdmt-footer>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const footer = required(layout.querySelector('cdmt-footer'), 'expected a footer')

    expect(header.hasAttribute('data-cdmt-fixed')).toBe(false)
    expect(footer.hasAttribute('data-cdmt-fixed')).toBe(false)

    layout.fixedHeader = true
    layout.fixedFooter = true
    await layout.updateComplete

    expect(header.hasAttribute('data-cdmt-fixed')).toBe(true)
    expect(footer.hasAttribute('data-cdmt-fixed')).toBe(true)

    layout.remove()
  })

  it('marks the matching-side drawer layoutFixed from fixedLeftDrawer/fixedRightDrawer', async () => {
    const layout = await mountLayout(
      '<cdmt-drawer side="left"></cdmt-drawer><cdmt-drawer side="right"></cdmt-drawer>'
    )
    const [leftDrawer, rightDrawer] = [...layout.querySelectorAll('cdmt-drawer')].sort((a, b) =>
      a.side.localeCompare(b.side)
    )

    layout.fixedLeftDrawer = true
    layout.fixedRightDrawer = true
    await layout.updateComplete

    expect(leftDrawer?.layoutFixed).toBe(true)
    expect(rightDrawer?.layoutFixed).toBe(true)

    layout.remove()
  })

  it('does not mark a drawer layoutFixed when its own fixed-left-drawer/right flag is false', async () => {
    const layout = await mountLayout(
      '<cdmt-drawer side="left"></cdmt-drawer><cdmt-drawer side="right"></cdmt-drawer>'
    )
    const drawers = [...layout.querySelectorAll('cdmt-drawer')]

    expect(drawers.every((drawer) => !drawer.layoutFixed)).toBe(true)

    layout.remove()
  })

  it('measures a fixed, visible header/footer but not a hidden or non-fixed one', async () => {
    const layout = await mountLayout(
      '<cdmt-header></cdmt-header><cdmt-footer></cdmt-footer><cdmt-page-container></cdmt-page-container>'
    )
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const footer = required(layout.querySelector('cdmt-footer'), 'expected a footer')
    const pageContainer = required(
      layout.querySelector('cdmt-page-container'),
      'expected a page-container'
    )
    stubRect(header, 64)
    stubRect(footer, 48)

    // Not fixed by default — no measurement should count toward the
    // fixed-only page-container padding.
    expect(pageContainer.style.paddingTop).toBe('0px')
    expect(pageContainer.style.paddingBottom).toBe('0px')

    layout.fixedHeader = true
    layout.fixedFooter = true
    await layout.updateComplete
    await Promise.resolve()

    expect(header.getBoundingClientRect).toHaveBeenCalled()
    expect(footer.getBoundingClientRect).toHaveBeenCalled()
    expect(pageContainer.style.paddingTop).toBe('64px')
    expect(pageContainer.style.paddingBottom).toBe('48px')

    layout.remove()
  })

  it('does not count a docked-but-static drawer toward the offset (flexbox already reserves its space)', async () => {
    const layout = await mountLayout('<cdmt-drawer side="left"></cdmt-drawer>')
    const drawer = required(layout.querySelector('cdmt-drawer'), 'expected a drawer')
    stubRect(drawer, 300)
    vi.mocked(drawer.getBoundingClientRect).mockClear()

    drawer.show()
    await drawer.updateComplete
    await Promise.resolve()

    // docked (not overlay/mobile/mini-to-overlay) and fixed-left-drawer is
    // false by default — flexbox alone reserves the space, no offset var
    // measurement needed.
    expect(drawer.getBoundingClientRect).not.toHaveBeenCalled()

    layout.remove()
  })

  it('counts a docked-and-fixed drawer toward the offset (position: fixed pulls it out of flex flow)', async () => {
    const layout = await mountLayout('<cdmt-drawer side="left"></cdmt-drawer>')
    const drawer = required(layout.querySelector('cdmt-drawer'), 'expected a drawer')
    stubRect(drawer, 300)

    layout.fixedLeftDrawer = true
    await layout.updateComplete
    drawer.show()
    await drawer.updateComplete
    await Promise.resolve()
    vi.mocked(drawer.getBoundingClientRect).mockClear()

    // trigger one more recompute pass to observe the call under the now-fixed state
    drawer.dispatchEvent(new CustomEvent('cdmt-layout-child-change', { bubbles: true }))
    await Promise.resolve()

    expect(drawer.getBoundingClientRect).toHaveBeenCalled()

    layout.remove()
  })

  it('insets a fixed header/footer, via left/right (not margin), by a docked-and-fixed drawer only on the corners it does not claim itself', async () => {
    const layout = await mountLayout(
      '<cdmt-header></cdmt-header><cdmt-footer></cdmt-footer><cdmt-drawer side="left"></cdmt-drawer><cdmt-drawer side="right"></cdmt-drawer>'
    )
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const footer = required(layout.querySelector('cdmt-footer'), 'expected a footer')
    const drawers = [...layout.querySelectorAll('cdmt-drawer')]
    const leftDrawer = required(
      drawers.find((d) => d.side === 'left'),
      'expected a left drawer'
    )
    const rightDrawer = required(
      drawers.find((d) => d.side === 'right'),
      'expected a right drawer'
    )
    stubRect(leftDrawer, 200)
    stubRect(rightDrawer, 220)

    layout.fixedHeader = true
    layout.fixedFooter = true
    layout.fixedLeftDrawer = true
    layout.fixedRightDrawer = true
    layout.headerOverLeftDrawer = false
    layout.headerOverRightDrawer = true
    layout.footerOverLeftDrawer = true
    layout.footerOverRightDrawer = false
    await layout.updateComplete
    leftDrawer.show()
    rightDrawer.show()
    await Promise.all([leftDrawer.updateComplete, rightDrawer.updateComplete])
    await Promise.resolve()

    // header cedes the left corner (headerOverLeftDrawer: false) -> insets by the left drawer's width
    expect(header.style.left).toBe('200px')
    // header claims the right corner (headerOverRightDrawer: true) -> no inset
    expect(header.style.right).toBe('0px')
    // footer claims the left corner -> no inset
    expect(footer.style.left).toBe('0px')
    // footer cedes the right corner -> insets by the right drawer's width
    expect(footer.style.right).toBe('220px')
    // fixed mode uses left/right, never margin (would double-count the offset)
    expect(header.style.marginLeft).toBe('')
    expect(header.style.marginRight).toBe('')
    expect(footer.style.marginLeft).toBe('')
    expect(footer.style.marginRight).toBe('')

    // becoming docked again must actually clear a previously-set left/right,
    // not just leave it stale — otherwise the last fixed-mode offset would
    // silently linger underneath the margin this same transition sets up.
    layout.fixedHeader = false
    layout.fixedFooter = false
    await layout.updateComplete

    expect(header.style.left).toBe('')
    expect(header.style.right).toBe('')
    expect(footer.style.left).toBe('')
    expect(footer.style.right).toBe('')

    layout.remove()
  })

  it('insets a docked (non-fixed) header/footer, via margin (not left/right), by a docked-and-fixed drawer', async () => {
    const layout = await mountLayout(
      '<cdmt-header></cdmt-header><cdmt-footer></cdmt-footer><cdmt-drawer side="left"></cdmt-drawer><cdmt-drawer side="right"></cdmt-drawer>'
    )
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const footer = required(layout.querySelector('cdmt-footer'), 'expected a footer')
    const drawers = [...layout.querySelectorAll('cdmt-drawer')]
    const leftDrawer = required(
      drawers.find((d) => d.side === 'left'),
      'expected a left drawer'
    )
    const rightDrawer = required(
      drawers.find((d) => d.side === 'right'),
      'expected a right drawer'
    )
    stubRect(leftDrawer, 200)
    stubRect(rightDrawer, 220)

    layout.fixedLeftDrawer = true
    layout.fixedRightDrawer = true
    layout.headerOverLeftDrawer = false
    layout.headerOverRightDrawer = false
    layout.footerOverLeftDrawer = false
    layout.footerOverRightDrawer = false
    await layout.updateComplete
    leftDrawer.show()
    rightDrawer.show()
    await Promise.all([leftDrawer.updateComplete, rightDrawer.updateComplete])
    await Promise.resolve()

    expect(header.style.marginLeft).toBe('200px')
    expect(header.style.marginRight).toBe('220px')
    expect(footer.style.marginLeft).toBe('200px')
    expect(footer.style.marginRight).toBe('220px')
    // docked mode uses margin, never left/right (position isn't fixed anyway)
    expect(header.style.left).toBe('')
    expect(footer.style.left).toBe('')

    layout.remove()
  })

  it("sets a docked (non-fixed) drawer's margin-top/margin-bottom from the header/footer fixed height", async () => {
    const layout = await mountLayout(
      '<cdmt-header></cdmt-header><cdmt-footer></cdmt-footer><cdmt-drawer side="left"></cdmt-drawer>'
    )
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const footer = required(layout.querySelector('cdmt-footer'), 'expected a footer')
    const drawer = required(layout.querySelector('cdmt-drawer'), 'expected a drawer')
    stubRect(header, 64)
    stubRect(footer, 48)

    layout.fixedHeader = true
    layout.fixedFooter = true
    await layout.updateComplete
    await Promise.resolve()

    // the drawer stays docked (fixedLeftDrawer is false) — its own margin
    // compensates for the fixed header/footer removing themselves from flow.
    expect(drawer.style.marginTop).toBe('64px')
    expect(drawer.style.marginBottom).toBe('48px')

    layout.remove()
  })

  it("clears a fixed drawer's margin-top/margin-bottom (its own stylesheet already insets it)", async () => {
    const layout = await mountLayout(
      '<cdmt-header></cdmt-header><cdmt-footer></cdmt-footer><cdmt-drawer side="left"></cdmt-drawer>'
    )
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const footer = required(layout.querySelector('cdmt-footer'), 'expected a footer')
    const drawer = required(layout.querySelector('cdmt-drawer'), 'expected a drawer')
    stubRect(header, 64)
    stubRect(footer, 48)

    layout.fixedHeader = true
    layout.fixedFooter = true
    layout.fixedLeftDrawer = true
    await layout.updateComplete
    drawer.show()
    await drawer.updateComplete
    await Promise.resolve()

    expect(drawer.style.marginTop).toBe('')
    expect(drawer.style.marginBottom).toBe('')

    layout.remove()
  })

  it('insets a fixed drawer by a header/footer real height only on the corners that header/footer claims', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header><cdmt-footer></cdmt-footer>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const footer = required(layout.querySelector('cdmt-footer'), 'expected a footer')
    stubRect(header, 72)
    stubRect(footer, 44)

    // header/footer left docked (not fixed) — still real, still measured for
    // the drawer's own inset purposes, unlike --cdmt-layout-header-height.
    layout.headerOverLeftDrawer = true
    layout.headerOverRightDrawer = false
    layout.footerOverLeftDrawer = false
    layout.footerOverRightDrawer = true
    await layout.updateComplete
    await Promise.resolve()

    expect(layout.style.getPropertyValue('--cdmt-layout-drawer-left-top-inset')).toBe('72px')
    expect(layout.style.getPropertyValue('--cdmt-layout-drawer-right-top-inset')).toBe('0px')
    expect(layout.style.getPropertyValue('--cdmt-layout-drawer-left-bottom-inset')).toBe('0px')
    expect(layout.style.getPropertyValue('--cdmt-layout-drawer-right-bottom-inset')).toBe('44px')

    layout.remove()
  })

  it('auto-routes a child appended dynamically after mount (real MutationObserver callback)', async () => {
    const layout = await mountLayout('')

    const header = document.createElement('cdmt-header')
    layout.append(header)
    await Promise.resolve()
    await Promise.resolve()

    expect(header.slot).toBe('header')

    layout.remove()
  })

  it('unobserves a previously-observed element before re-observing on a second children-changed pass', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const unobserveSpy = vi.spyOn(ResizeObserver.prototype, 'unobserve')

    header.remove()
    await Promise.resolve()
    await Promise.resolve()

    expect(unobserveSpy).toHaveBeenCalledWith(header)

    unobserveSpy.mockRestore()
    layout.remove()
  })

  it('recomputes offsets when its own ResizeObserver reports a change (real callback wiring)', async () => {
    // happy-dom has no real layout engine, so a genuine resize is never
    // observable here — stub the global constructor to capture and
    // manually invoke the callback this component actually wires up,
    // proving that wiring (not the browser's own resize detection) works.
    let capturedCallback: ResizeObserverCallback | undefined
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          capturedCallback = callback
        }
        observe(): void {
          // no-op — the test invokes capturedCallback directly instead
        }
        unobserve(): void {
          // no-op
        }
        disconnect(): void {
          // no-op
        }
      }
    )

    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    layout.fixedHeader = true
    await layout.updateComplete
    stubRect(header, 80)
    vi.mocked(header.getBoundingClientRect).mockClear()

    capturedCallback?.([], {} as ResizeObserver)

    expect(header.getBoundingClientRect).toHaveBeenCalled()

    layout.remove()
    vi.unstubAllGlobals()
  })

  it('recomputes offsets in reaction to a bubbling cdmt-layout-child-change event', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    layout.fixedHeader = true
    await layout.updateComplete
    stubRect(header, 70)
    vi.mocked(header.getBoundingClientRect).mockClear()

    header.dispatchEvent(new CustomEvent('cdmt-layout-child-change', { bubbles: true }))
    await Promise.resolve()

    expect(header.getBoundingClientRect).toHaveBeenCalled()

    layout.remove()
  })

  it('stops reacting to new children and to cdmt-layout-child-change after being disconnected', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    layout.fixedHeader = true
    await layout.updateComplete
    stubRect(header, 90)

    layout.remove()
    vi.mocked(header.getBoundingClientRect).mockClear()

    // A child added after disconnect should never get auto-routed again.
    const footer = document.createElement('cdmt-footer')
    layout.append(footer)
    await Promise.resolve()
    await Promise.resolve()

    expect(footer.slot).toBe('')

    // The event listener should no longer trigger a recompute either.
    header.dispatchEvent(new CustomEvent('cdmt-layout-child-change', { bubbles: true }))
    await Promise.resolve()

    expect(header.getBoundingClientRect).not.toHaveBeenCalled()
  })

  it('does not recompute offsets when an unrelated property (container) changes', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    layout.fixedHeader = true
    await layout.updateComplete
    stubRect(header, 90)
    vi.mocked(header.getBoundingClientRect).mockClear()

    layout.container = true
    await layout.updateComplete

    expect(header.getBoundingClientRect).not.toHaveBeenCalled()

    layout.remove()
  })

  it('does not run #applyFixedStates when an unrelated property (container) changes', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const toggleSpy = vi.spyOn(header, 'toggleAttribute')

    layout.container = true
    await layout.updateComplete

    expect(toggleSpy).not.toHaveBeenCalled()

    layout.remove()
  })

  it('runs #applyFixedStates and recomputes offsets from fixedHeader alone', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const rectSpy = vi.spyOn(header, 'getBoundingClientRect')
    rectSpy.mockClear()

    layout.fixedHeader = true
    await layout.updateComplete

    expect(header.hasAttribute('data-cdmt-fixed')).toBe(true)
    expect(rectSpy).toHaveBeenCalled()

    layout.remove()
  })

  it('runs #applyFixedStates and recomputes offsets from fixedFooter alone', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header><cdmt-footer></cdmt-footer>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const footer = required(layout.querySelector('cdmt-footer'), 'expected a footer')
    const rectSpy = vi.spyOn(header, 'getBoundingClientRect')
    rectSpy.mockClear()

    layout.fixedFooter = true
    await layout.updateComplete

    expect(footer.hasAttribute('data-cdmt-fixed')).toBe(true)
    expect(rectSpy).toHaveBeenCalled()

    layout.remove()
  })

  it('runs #applyFixedStates from fixedLeftDrawer alone', async () => {
    const layout = await mountLayout('<cdmt-drawer side="left"></cdmt-drawer>')
    const drawer = required(layout.querySelector('cdmt-drawer'), 'expected a drawer')

    layout.fixedLeftDrawer = true
    await layout.updateComplete

    expect(drawer.layoutFixed).toBe(true)

    layout.remove()
  })

  it('runs #applyFixedStates from fixedRightDrawer alone', async () => {
    const layout = await mountLayout('<cdmt-drawer side="right"></cdmt-drawer>')
    const drawer = required(layout.querySelector('cdmt-drawer'), 'expected a drawer')

    layout.fixedRightDrawer = true
    await layout.updateComplete

    expect(drawer.layoutFixed).toBe(true)

    layout.remove()
  })

  it('recomputes offsets from fixedLeftDrawer alone', async () => {
    // Deliberately no drawer mounted: a real drawer's own `layoutFixed` update
    // (from #applyFixedStates, a separate gate) dispatches its own
    // cdmt-layout-child-change event, which would trigger a recompute via
    // that side channel and mask whether *this* gate actually fired.
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const rectSpy = vi.spyOn(header, 'getBoundingClientRect')
    rectSpy.mockClear()

    layout.fixedLeftDrawer = true
    await layout.updateComplete

    expect(rectSpy).toHaveBeenCalled()

    layout.remove()
  })

  it('recomputes offsets from fixedRightDrawer alone', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const rectSpy = vi.spyOn(header, 'getBoundingClientRect')
    rectSpy.mockClear()

    layout.fixedRightDrawer = true
    await layout.updateComplete

    expect(rectSpy).toHaveBeenCalled()

    layout.remove()
  })

  it('recomputes offsets from headerOverLeftDrawer alone', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const rectSpy = vi.spyOn(header, 'getBoundingClientRect')
    rectSpy.mockClear()

    layout.headerOverLeftDrawer = false
    await layout.updateComplete

    expect(rectSpy).toHaveBeenCalled()

    layout.remove()
  })

  it('recomputes offsets from headerOverRightDrawer alone', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const rectSpy = vi.spyOn(header, 'getBoundingClientRect')
    rectSpy.mockClear()

    layout.headerOverRightDrawer = false
    await layout.updateComplete

    expect(rectSpy).toHaveBeenCalled()

    layout.remove()
  })

  it('recomputes offsets from footerOverLeftDrawer alone', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const rectSpy = vi.spyOn(header, 'getBoundingClientRect')
    rectSpy.mockClear()

    layout.footerOverLeftDrawer = false
    await layout.updateComplete

    expect(rectSpy).toHaveBeenCalled()

    layout.remove()
  })

  it('recomputes offsets from footerOverRightDrawer alone', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const rectSpy = vi.spyOn(header, 'getBoundingClientRect')
    rectSpy.mockClear()

    layout.footerOverRightDrawer = false
    await layout.updateComplete

    expect(rectSpy).toHaveBeenCalled()

    layout.remove()
  })

  it('only observes the header/footer/drawers actually present, not missing ones', async () => {
    const observeCalls: unknown[] = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(target: unknown): void {
          observeCalls.push(target)
        }
        unobserve(): void {
          // no-op
        }
        disconnect(): void {
          // no-op
        }
      }
    )

    const layout = await mountLayout('<cdmt-header></cdmt-header>')

    expect(observeCalls).toHaveLength(1)

    layout.remove()
    vi.unstubAllGlobals()
  })

  it('observes a present left-side drawer specifically (not skipped by side lookup)', async () => {
    const observeCalls: unknown[] = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(target: unknown): void {
          observeCalls.push(target)
        }
        unobserve(): void {
          // no-op
        }
        disconnect(): void {
          // no-op
        }
      }
    )

    const layout = await mountLayout('<cdmt-drawer side="left"></cdmt-drawer>')
    const drawer = required(layout.querySelector('cdmt-drawer'), 'expected a drawer')

    expect(observeCalls).toStrictEqual([drawer])

    layout.remove()
    vi.unstubAllGlobals()
  })

  it('observes a present right-side drawer specifically (not skipped by side lookup)', async () => {
    const observeCalls: unknown[] = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(target: unknown): void {
          observeCalls.push(target)
        }
        unobserve(): void {
          // no-op
        }
        disconnect(): void {
          // no-op
        }
      }
    )

    const layout = await mountLayout('<cdmt-drawer side="right"></cdmt-drawer>')
    const drawer = required(layout.querySelector('cdmt-drawer'), 'expected a drawer')

    expect(observeCalls).toStrictEqual([drawer])

    layout.remove()
    vi.unstubAllGlobals()
  })

  it('sets the real measured width on the correct left/right page-container padding', async () => {
    const layout = await mountLayout(
      '<cdmt-drawer side="left"></cdmt-drawer><cdmt-drawer side="right"></cdmt-drawer><cdmt-page-container></cdmt-page-container>'
    )
    const pageContainer = required(
      layout.querySelector('cdmt-page-container'),
      'expected a page-container'
    )
    const drawers = [...layout.querySelectorAll('cdmt-drawer')]
    const leftDrawer = required(
      drawers.find((d) => d.side === 'left'),
      'expected a left drawer'
    )
    const rightDrawer = required(
      drawers.find((d) => d.side === 'right'),
      'expected a right drawer'
    )
    stubRect(leftDrawer, 240)
    stubRect(rightDrawer, 260)

    layout.fixedLeftDrawer = true
    layout.fixedRightDrawer = true
    await layout.updateComplete
    leftDrawer.show()
    rightDrawer.show()
    await Promise.all([leftDrawer.updateComplete, rightDrawer.updateComplete])
    await Promise.resolve()

    expect(pageContainer.style.paddingLeft).toBe('240px')
    expect(pageContainer.style.paddingRight).toBe('260px')

    layout.remove()
  })

  it('renders header/drawer/page-container/footer slots in its shadow root', () => {
    const slots = [...(el.shadowRoot?.querySelectorAll('slot') ?? [])].map((slot) => slot.name)

    expect(slots).toStrictEqual([
      'header',
      'drawer-left',
      'page-container',
      'drawer-right',
      'footer',
      ''
    ])
  })
})
