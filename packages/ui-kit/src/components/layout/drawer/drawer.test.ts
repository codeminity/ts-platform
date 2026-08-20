// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CdmtDrawer } from './drawer.js'

type EventHandler = (event: Event) => void

class FakeMediaQueryList extends EventTarget {
  matches: boolean
  media: string

  constructor(media: string, matches: boolean) {
    super()
    this.media = media
    this.matches = matches
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    super.addEventListener(type, listener)
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    super.removeEventListener(type, listener)
  }

  setMatches(matches: boolean): void {
    this.matches = matches
    this.dispatchEvent(Object.assign(new Event('change'), { matches }))
  }
}

let currentMediaQuery: FakeMediaQueryList | undefined

function stubMatchMedia(initialMatches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((media: string) => {
      currentMediaQuery = new FakeMediaQueryList(media, initialMatches)
      return currentMediaQuery
    })
  )
}

function getBackdrop(el: CdmtDrawer): HTMLElement {
  const backdrop = el.shadowRoot?.querySelector('.cdmt-drawer__backdrop')
  if (!backdrop) throw new Error('expected a backdrop element to exist')
  return backdrop as HTMLElement
}

describe(CdmtDrawer, () => {
  let el: CdmtDrawer

  beforeEach(async () => {
    stubMatchMedia(false)
    el = document.createElement('cdmt-drawer')
    document.body.append(el)
    await el.updateComplete
  })

  afterEach(() => {
    el.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('defaults to hidden, side left, not overlay, width 300, not mini, miniWidth 57, breakpoint 1023, behavior default', () => {
    expect(el.modelValue).toBe(false)
    expect(el.side).toBe('left')
    expect(el.overlay).toBe(false)
    expect(el.width).toBe(300)
    expect(el.mini).toBe(false)
    expect(el.miniWidth).toBe(57)
    expect(el.miniToOverlay).toBe(false)
    expect(el.breakpoint).toBe(1023)
    expect(el.behavior).toBe('default')
    expect(el.persistent).toBe(false)
    expect(el.showIfAbove).toBe(false)
    expect(el.bordered).toBe(false)
    expect(el.elevated).toBe(false)
    expect(el.noMiniAnimation).toBe(false)
    expect(el.hasAttribute('hidden')).toBe(true)
  })

  it('reads isDocked correctly synchronously at construction time, before any update has run', () => {
    const fresh = document.createElement('cdmt-drawer')

    // No `await updateComplete` here on purpose — this checks the state
    // right after the constructor runs, before `updated()`/`willUpdate()`
    // have had any chance to recompute anything.
    expect(fresh.isDocked).toBe(true)
  })

  it('shows via show(), hides via hide(), flips via toggle()', async () => {
    el.show()
    await el.updateComplete

    expect(el.modelValue).toBe(true)
    expect(el.hasAttribute('hidden')).toBe(false)

    el.hide()
    await el.updateComplete

    expect(el.modelValue).toBe(false)
    expect(el.hasAttribute('hidden')).toBe(true)

    el.toggle()
    await el.updateComplete

    expect(el.modelValue).toBe(true)

    el.toggle()
    await el.updateComplete

    expect(el.modelValue).toBe(false)
  })

  it('dispatches before-show/model-value-change/show in order when shown', async () => {
    const events: string[] = []
    el.addEventListener('cdmt-before-show', () => events.push('before-show'))
    el.addEventListener('cdmt-model-value-change', (event) => {
      events.push(`model-value-change:${String((event as CustomEvent).detail)}`)
    })
    el.addEventListener('cdmt-show', () => events.push('show'))

    el.show()
    await el.updateComplete

    expect(events).toStrictEqual(['before-show', 'model-value-change:true', 'show'])
  })

  it('dispatches before-hide/model-value-change/hide in order when hidden', async () => {
    el.show()
    await el.updateComplete

    const events: string[] = []
    el.addEventListener('cdmt-before-hide', () => events.push('before-hide'))
    el.addEventListener('cdmt-model-value-change', (event) => {
      events.push(`model-value-change:${String((event as CustomEvent).detail)}`)
    })
    el.addEventListener('cdmt-hide', () => events.push('hide'))

    el.hide()
    await el.updateComplete

    expect(events).toStrictEqual(['before-hide', 'model-value-change:false', 'hide'])
  })

  it('does not dispatch any show/hide events on initial connect', async () => {
    const fresh = document.createElement('cdmt-drawer')
    const handler = vi.fn<EventHandler>()
    fresh.addEventListener('cdmt-model-value-change', handler)
    document.body.append(fresh)
    await fresh.updateComplete

    expect(handler).not.toHaveBeenCalled()

    fresh.remove()
  })

  it('sets inline width from the width prop, changed in isolation while already shown', async () => {
    el.show()
    await el.updateComplete

    el.width = 320
    await el.updateComplete

    expect(el.style.width).toBe('320px')
  })

  it('recomputes width when only miniWidth changes, mini already true, while shown', async () => {
    el.show()
    el.mini = true
    await el.updateComplete

    el.miniWidth = 80
    await el.updateComplete

    expect(el.style.width).toBe('80px')
  })

  it('collapses back to 0 width when hidden again while docked', async () => {
    el.show()
    await el.updateComplete

    expect(el.style.width).toBe('300px')

    el.hide()
    await el.updateComplete

    expect(el.style.width).toBe('0px')
  })

  it('forces fixed and non-docked when mini + miniToOverlay', async () => {
    el.mini = true
    el.miniToOverlay = true
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-fixed')).toBe(true)
    expect(el.isDocked).toBe(false)
  })

  it('re-syncs fixed/layout state when mini changes alone (isolated from miniToOverlay)', async () => {
    const handler = vi.fn<EventHandler>()
    el.addEventListener('cdmt-layout-child-change', handler)

    el.mini = true
    await el.updateComplete

    expect(handler).toHaveBeenCalled()
  })

  it('re-syncs fixed/layout state when miniToOverlay changes alone (mini already true)', async () => {
    el.mini = true
    await el.updateComplete

    const handler = vi.fn<EventHandler>()
    el.addEventListener('cdmt-layout-child-change', handler)

    el.miniToOverlay = true
    await el.updateComplete

    expect(handler).toHaveBeenCalled()
    expect(el.hasAttribute('data-cdmt-fixed')).toBe(true)
  })

  it('stays docked when mini without miniToOverlay', async () => {
    el.mini = true
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-fixed')).toBe(false)
    expect(el.isDocked).toBe(true)
  })

  it('is never mobile-mode-fixed when behavior is desktop, even if matchMedia would say mobile', async () => {
    // Proves the explicit 'desktop' branch short-circuits BEFORE the
    // matchMedia fallthrough runs — matchMedia here deliberately claims a
    // mobile-width match, which would flip these assertions if the
    // short-circuit didn't actually happen.
    stubMatchMedia(true)
    el.behavior = 'desktop'
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-fixed')).toBe(false)
    expect(el.isDocked).toBe(true)
  })

  it('reacts live to a matchMedia change crossing the breakpoint', async () => {
    expect(el.hasAttribute('data-cdmt-fixed')).toBe(false)

    currentMediaQuery?.setMatches(true)
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-fixed')).toBe(true)
    expect(el.isDocked).toBe(false)
  })

  it('stops listening to a stale mediaQuery once breakpoint changes again (old listener genuinely removed)', async () => {
    const staleMediaQuery = currentMediaQuery

    el.breakpoint = 640
    await el.updateComplete

    staleMediaQuery?.setMatches(true)

    expect(el.hasAttribute('data-cdmt-fixed')).toBe(false)
  })

  it('shows automatically on connect when showIfAbove is true and above the breakpoint', async () => {
    const el2 = document.createElement('cdmt-drawer')
    el2.showIfAbove = true
    document.body.append(el2)
    await el2.updateComplete

    expect(el2.modelValue).toBe(true)

    el2.remove()
  })

  it('shows automatically from showIfAbove when behavior is explicitly desktop, even if matchMedia would say mobile', async () => {
    stubMatchMedia(true)
    const el2 = document.createElement('cdmt-drawer')
    el2.showIfAbove = true
    el2.behavior = 'desktop'
    document.body.append(el2)
    await el2.updateComplete

    expect(el2.modelValue).toBe(true)

    el2.remove()
  })

  it('does not auto-show from showIfAbove when behavior is explicitly mobile', async () => {
    const el2 = document.createElement('cdmt-drawer')
    el2.showIfAbove = true
    el2.behavior = 'mobile'
    document.body.append(el2)
    await el2.updateComplete

    expect(el2.modelValue).toBe(false)

    el2.remove()
  })

  it('marks itself overlay-fixed when fixed via mobile mode (not docked)', async () => {
    el.behavior = 'mobile'
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-overlay-fixed')).toBe(true)
  })

  it('does not mark itself overlay-fixed when fixed purely via layoutFixed (docked, sits beside a fixed header/footer)', async () => {
    el.layoutFixed = true
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-fixed')).toBe(true)
    expect(el.isDocked).toBe(true)
    expect(el.hasAttribute('data-cdmt-overlay-fixed')).toBe(false)
  })

  it('enables transitions only after two animation frames past connect, not before', async () => {
    const fresh = document.createElement('cdmt-drawer')
    document.body.append(fresh)
    await fresh.updateComplete

    expect(fresh.hasAttribute('data-cdmt-transitions-enabled')).toBe(false)

    await new Promise((resolve) => requestAnimationFrame(resolve))

    expect(fresh.hasAttribute('data-cdmt-transitions-enabled')).toBe(false)

    await new Promise((resolve) => requestAnimationFrame(resolve))

    expect(fresh.hasAttribute('data-cdmt-transitions-enabled')).toBe(true)
    expect(fresh.getAttribute('data-cdmt-transitions-enabled')).toBe('')

    fresh.remove()
  })

  it('does not suppress the transition when a metrics-relevant prop changes but fixedness stays the same, while closed', async () => {
    const transitionSetterSpy = vi.spyOn(CSSStyleDeclaration.prototype, 'transition', 'set')

    // Still docked, still closed — data-cdmt-fixed never changes here, so
    // this must NOT be treated as a mode switch even though the drawer is
    // closed and #syncFixedAndNotifyLayout does run (for the width prop).
    el.width = 250
    await el.updateComplete

    expect(transitionSetterSpy).not.toHaveBeenCalled()
  })

  it('detects the mode switch from the real data-cdmt-fixed attribute, not just from #isFixed alone', async () => {
    el.overlay = true
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-fixed')).toBe(true)
    expect(el.modelValue).toBe(false)

    const transitionSetterSpy = vi.spyOn(CSSStyleDeclaration.prototype, 'transition', 'set')
    // Switches back to docked (not fixed) while still closed — a real mode
    // switch away from an attribute that was genuinely already present.
    el.overlay = false
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-fixed')).toBe(false)
    expect(transitionSetterSpy.mock.calls.map((call) => call[0])).toStrictEqual(['none', ''])
  })

  it('shows the backdrop only when open and in a fixed/overlay mode', async () => {
    el.overlay = true
    await el.updateComplete

    expect(getBackdrop(el).classList.contains('cdmt-drawer__backdrop--visible')).toBe(false)

    el.show()
    await el.updateComplete

    expect(getBackdrop(el).classList.contains('cdmt-drawer__backdrop--visible')).toBe(true)
  })

  it('does not show the backdrop for a docked (non-fixed) open drawer', async () => {
    el.show()
    await el.updateComplete

    expect(getBackdrop(el).classList.contains('cdmt-drawer__backdrop--visible')).toBe(false)
    // Exact class list, not just "doesn't contain the visible token" — this
    // also catches the ternary's false-branch producing stray extra classes
    // instead of a clean empty string.
    expect(getBackdrop(el).className.trim()).toBe('cdmt-drawer__backdrop')
  })

  it('closes when the backdrop is clicked', async () => {
    el.overlay = true
    el.show()
    await el.updateComplete

    getBackdrop(el).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await el.updateComplete

    expect(el.modelValue).toBe(false)
  })

  it('does not close on backdrop click when persistent', async () => {
    el.overlay = true
    el.persistent = true
    el.show()
    await el.updateComplete

    getBackdrop(el).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await el.updateComplete

    expect(el.modelValue).toBe(true)
  })

  it('closes on Escape when open', async () => {
    el.show()
    await el.updateComplete

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await el.updateComplete

    expect(el.modelValue).toBe(false)
  })

  it('ignores non-Escape keys', async () => {
    el.show()
    await el.updateComplete

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await el.updateComplete

    expect(el.modelValue).toBe(true)
  })

  it('stops listening for Escape after being disconnected', async () => {
    el.show()
    await el.updateComplete
    el.remove()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(el.modelValue).toBe(true)
  })

  it('cdmt-layout-child-change actually bubbles, so a parent layout can hear it', async () => {
    const parent = document.createElement('div')
    document.body.append(parent)
    parent.append(el)
    const handler = vi.fn<EventHandler>()
    parent.addEventListener('cdmt-layout-child-change', handler)

    el.overlay = true
    await el.updateComplete

    expect(handler).toHaveBeenCalled()

    parent.remove()
  })

  it('queries matchMedia with the exact breakpoint-derived media string', async () => {
    el.breakpoint = 640
    await el.updateComplete

    expect(currentMediaQuery?.media).toBe('(max-width: 640px)')
  })

  it('stops reacting to matchMedia changes after being disconnected', () => {
    const mediaQuery = currentMediaQuery
    el.remove()

    mediaQuery?.setMatches(true)

    expect(el.hasAttribute('data-cdmt-fixed')).toBe(false)
  })

  it('does not re-toggle data-cdmt-fixed or re-notify the layout when an unrelated property changes', async () => {
    const handler = vi.fn<EventHandler>()
    el.addEventListener('cdmt-layout-child-change', handler)

    el.persistent = true
    await el.updateComplete

    expect(handler).not.toHaveBeenCalled()
  })

  it('toggles data-cdmt-no-mini-animation to match noMiniAnimation, and only when it changes', async () => {
    el.noMiniAnimation = true
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-no-mini-animation')).toBe(true)

    el.noMiniAnimation = false
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-no-mini-animation')).toBe(false)
  })

  it('does not touch data-cdmt-no-mini-animation when an unrelated property changes', async () => {
    el.noMiniAnimation = true
    await el.updateComplete

    const toggleSpy = vi.spyOn(el, 'toggleAttribute')
    el.bordered = true
    await el.updateComplete

    expect(toggleSpy).not.toHaveBeenCalledWith('data-cdmt-no-mini-animation', expect.anything())
  })
})
