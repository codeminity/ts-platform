// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../drawer/drawer.js'
import '../footer/footer.js'
import '../header/header.js'
import '../page-container/page-container.js'
import './layout.js'

import type { CdmtLayout } from './layout.js'

function required<T>(value: T | null | undefined, message: string): T {
  if (value == null) throw new Error(message)
  return value
}

// happy-dom has no real layout engine — getBoundingClientRect() always
// returns all-zero values here, so these tests verify the *gating* logic
// (is a measurement even attempted for a given element) rather than actual
// pixel values, which is instead covered by a real-browser e2e spec.
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

describe('CdmtLayout', () => {
  let el: CdmtLayout

  beforeEach(async () => {
    el = await mountLayout('')
  })

  afterEach(() => {
    el.remove()
  })

  it('defaults to view "hhh lpr fff" and container false', () => {
    expect(el.view).toBe('hhh lpr fff')
    expect(el.container).toBe(false)
  })

  it('reflects container as an attribute', async () => {
    el.container = true
    await el.updateComplete

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

  it('marks header/footer fixed only when their row has an uppercase letter', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header><cdmt-footer></cdmt-footer>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const footer = required(layout.querySelector('cdmt-footer'), 'expected a footer')

    expect(header.hasAttribute('data-cdmt-fixed')).toBe(false)
    expect(footer.hasAttribute('data-cdmt-fixed')).toBe(false)

    layout.view = 'HHH lpr FFF'
    await layout.updateComplete

    expect(header.hasAttribute('data-cdmt-fixed')).toBe(true)
    expect(footer.hasAttribute('data-cdmt-fixed')).toBe(true)
    layout.remove()
  })

  it("marks a drawer viewFixed from the middle row's first/third character, matched by side", async () => {
    const layout = await mountLayout(
      '<cdmt-drawer side="left"></cdmt-drawer><cdmt-drawer side="right"></cdmt-drawer>'
    )
    const [leftDrawer, rightDrawer] = [...layout.querySelectorAll('cdmt-drawer')].sort((a, b) =>
      a.side.localeCompare(b.side)
    )

    layout.view = 'hhh LpR fff'
    await layout.updateComplete

    expect(leftDrawer?.viewFixed).toBe(true)
    expect(rightDrawer?.viewFixed).toBe(true)
    layout.remove()
  })

  it('does not mark a drawer viewFixed when its side is lowercase in the middle row', async () => {
    const layout = await mountLayout('<cdmt-drawer side="left"></cdmt-drawer>')
    const drawer = required(layout.querySelector('cdmt-drawer'), 'expected a drawer')

    layout.view = 'hhh lpr fff'
    await layout.updateComplete

    expect(drawer.viewFixed).toBe(false)
    layout.remove()
  })

  it('measures a fixed, visible header/footer but not a hidden or non-fixed one', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header><cdmt-footer></cdmt-footer>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const footer = required(layout.querySelector('cdmt-footer'), 'expected a footer')
    stubRect(header, 64)
    stubRect(footer, 48)

    // Not fixed by default view — no measurement should count.
    expect(layout.style.getPropertyValue('--cdmt-layout-header-height')).toBe('0px')
    expect(layout.style.getPropertyValue('--cdmt-layout-footer-height')).toBe('0px')

    layout.view = 'HHH lpr FFF'
    await layout.updateComplete
    await Promise.resolve()

    expect(header.getBoundingClientRect).toHaveBeenCalled()
    expect(footer.getBoundingClientRect).toHaveBeenCalled()
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

    // docked (not overlay/mobile/mini-to-overlay) and view-string non-fixed
    // by default — flexbox alone reserves the space, no offset var needed.
    expect(drawer.getBoundingClientRect).not.toHaveBeenCalled()
    layout.remove()
  })

  it('counts a docked-and-fixed drawer toward the offset (position: fixed pulls it out of flex flow)', async () => {
    const layout = await mountLayout('<cdmt-drawer side="left"></cdmt-drawer>')
    const drawer = required(layout.querySelector('cdmt-drawer'), 'expected a drawer')
    stubRect(drawer, 300)

    layout.view = 'hhh Lpr fff'
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
    layout.view = 'HHH lpr fff'
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
    layout.view = 'HHH lpr fff'
    await layout.updateComplete
    stubRect(header, 70)
    vi.mocked(header.getBoundingClientRect).mockClear()

    header.dispatchEvent(new CustomEvent('cdmt-layout-child-change', { bubbles: true }))
    await Promise.resolve()

    expect(header.getBoundingClientRect).toHaveBeenCalled()
    layout.remove()
  })

  it('treats a malformed (too-short) view string gracefully via the destructuring defaults', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')

    // Only 2 space-separated parts instead of 3 — footerRow falls back to ''.
    layout.view = 'HHH lpr'
    await layout.updateComplete

    expect(header.hasAttribute('data-cdmt-fixed')).toBe(true)
    // '' has no uppercase letter, so nothing crashes and footer-side config
    // resolves to "not fixed" rather than throwing on a missing row.
  })

  it('treats an empty view string gracefully — middleRow/footerRow fall back to the destructuring defaults', async () => {
    const layout = await mountLayout(
      '<cdmt-header></cdmt-header><cdmt-footer></cdmt-footer><cdmt-drawer side="left"></cdmt-drawer>'
    )
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    const footer = required(layout.querySelector('cdmt-footer'), 'expected a footer')
    const drawer = required(layout.querySelector('cdmt-drawer'), 'expected a drawer')

    layout.view = ''
    await layout.updateComplete

    expect(header.hasAttribute('data-cdmt-fixed')).toBe(false)
    expect(footer.hasAttribute('data-cdmt-fixed')).toBe(false)
    // middleRow falls back to '' here — '' .startsWith('L') is false, so
    // this specifically proves middleRow's own destructuring default works.
    expect(drawer.viewFixed).toBe(false)
  })

  it('does not mark a right-side drawer viewFixed when the middle row does not end with R', async () => {
    const layout = await mountLayout('<cdmt-drawer side="right"></cdmt-drawer>')
    const drawer = required(layout.querySelector('cdmt-drawer'), 'expected a drawer')

    layout.view = 'hhh lpr fff'
    await layout.updateComplete

    expect(drawer.viewFixed).toBe(false)
    layout.remove()
  })

  it('stops reacting to new children and to cdmt-layout-child-change after being disconnected', async () => {
    const layout = await mountLayout('<cdmt-header></cdmt-header>')
    const header = required(layout.querySelector('cdmt-header'), 'expected a header')
    layout.view = 'HHH lpr fff'
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
    layout.view = 'HHH lpr fff'
    await layout.updateComplete
    stubRect(header, 90)
    vi.mocked(header.getBoundingClientRect).mockClear()

    layout.container = true
    await layout.updateComplete

    expect(header.getBoundingClientRect).not.toHaveBeenCalled()
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

    expect(observeCalls).toEqual([drawer])
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

    expect(observeCalls).toEqual([drawer])
    layout.remove()
    vi.unstubAllGlobals()
  })

  it('sets the real measured width on the correct left/right drawer offset CSS vars', async () => {
    const layout = await mountLayout(
      '<cdmt-drawer side="left"></cdmt-drawer><cdmt-drawer side="right"></cdmt-drawer>'
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

    layout.view = 'hhh LpR fff'
    await layout.updateComplete
    leftDrawer.show()
    rightDrawer.show()
    await Promise.all([leftDrawer.updateComplete, rightDrawer.updateComplete])
    await Promise.resolve()

    expect(layout.style.getPropertyValue('--cdmt-layout-drawer-left-width')).toBe('240px')
    expect(layout.style.getPropertyValue('--cdmt-layout-drawer-right-width')).toBe('260px')
    layout.remove()
  })

  it('renders header/drawer/page-container/footer slots in its shadow root', () => {
    const slots = [...(el.shadowRoot?.querySelectorAll('slot') ?? [])].map((slot) => slot.name)
    expect(slots).toEqual(['header', 'drawer-left', 'page-container', 'drawer-right', 'footer', ''])
  })
})
