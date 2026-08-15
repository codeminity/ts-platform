// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import './drawer.js'

import type { CdmtDrawer } from './drawer.js'

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

describe('CdmtDrawer', () => {
  let el: CdmtDrawer

  beforeEach(async () => {
    stubMatchMedia(false)
    el = document.createElement('cdmt-drawer')
    document.body.append(el)
    await el.updateComplete
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

  it('reflects side/overlay/mini/bordered/elevated as attributes', async () => {
    el.side = 'right'
    el.overlay = true
    el.mini = true
    el.bordered = true
    el.elevated = true
    await el.updateComplete

    expect(el.getAttribute('side')).toBe('right')
    expect(el.hasAttribute('overlay')).toBe(true)
    expect(el.hasAttribute('mini')).toBe(true)
    expect(el.hasAttribute('bordered')).toBe(true)
    expect(el.hasAttribute('elevated')).toBe(true)
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

    expect(events).toEqual(['before-show', 'model-value-change:true', 'show'])
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

    expect(events).toEqual(['before-hide', 'model-value-change:false', 'hide'])
  })

  it('does not dispatch any show/hide events on initial connect', async () => {
    const fresh = document.createElement('cdmt-drawer')
    const handler = vi.fn()
    fresh.addEventListener('cdmt-model-value-change', handler)
    document.body.append(fresh)
    await fresh.updateComplete

    expect(handler).not.toHaveBeenCalled()
    fresh.remove()
  })

  it('sets inline width from the width prop, and from miniWidth when mini', async () => {
    el.width = 320
    await el.updateComplete
    expect(el.style.width).toBe('320px')

    el.mini = true
    await el.updateComplete
    expect(el.style.width).toBe('57px')
  })

  it('recomputes width when only miniWidth changes, mini already true', async () => {
    el.mini = true
    await el.updateComplete

    el.miniWidth = 80
    await el.updateComplete

    expect(el.style.width).toBe('80px')
  })

  it('is not fixed by default (docked, static)', () => {
    expect(el.hasAttribute('data-cdmt-fixed')).toBe(false)
    expect(el.isDocked).toBe(true)
  })

  it('forces fixed and non-docked when overlay is true', async () => {
    el.overlay = true
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-fixed')).toBe(true)
    expect(el.isDocked).toBe(false)
  })

  it('forces fixed and non-docked when mini + miniToOverlay', async () => {
    el.mini = true
    el.miniToOverlay = true
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-fixed')).toBe(true)
    expect(el.isDocked).toBe(false)
  })

  it('re-syncs fixed/layout state when mini changes alone (isolated from miniToOverlay)', async () => {
    const handler = vi.fn()
    el.addEventListener('cdmt-layout-child-change', handler)

    el.mini = true
    await el.updateComplete

    expect(handler).toHaveBeenCalled()
  })

  it('re-syncs fixed/layout state when miniToOverlay changes alone (mini already true)', async () => {
    el.mini = true
    await el.updateComplete

    const handler = vi.fn()
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

  it('is fixed and non-docked whenever behavior is mobile, regardless of overlay', async () => {
    el.behavior = 'mobile'
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-fixed')).toBe(true)
    expect(el.isDocked).toBe(false)
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

  it('picks up mobile mode from a matchMedia match on default behavior', async () => {
    stubMatchMedia(true)
    const mobileFirst = document.createElement('cdmt-drawer')
    document.body.append(mobileFirst)
    await mobileFirst.updateComplete

    expect(mobileFirst.hasAttribute('data-cdmt-fixed')).toBe(true)
    expect(mobileFirst.isDocked).toBe(false)
    mobileFirst.remove()
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

  it("showIfAbove's own mobile-mode check queries matchMedia with the exact breakpoint-derived string", async () => {
    const el2 = document.createElement('cdmt-drawer')
    el2.showIfAbove = true
    el2.breakpoint = 900
    document.body.append(el2)
    await el2.updateComplete

    // willUpdate's own #computeIsMobileMode call — a separate matchMedia
    // invocation from #setupBreakpointWatcher's (which also runs on this
    // same first update), so this asserts on the *last* call specifically.
    const calls = vi.mocked(window.matchMedia).mock.calls
    expect(calls.some((call) => call[0] === '(max-width: 900px)')).toBe(true)
    el2.remove()
  })

  it('does not auto-show from showIfAbove when in mobile mode', async () => {
    stubMatchMedia(true)
    const el2 = document.createElement('cdmt-drawer')
    el2.showIfAbove = true
    document.body.append(el2)
    await el2.updateComplete

    expect(el2.modelValue).toBe(false)
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

  it('is forced fixed by the parent layout via the viewFixed property', async () => {
    el.viewFixed = true
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-fixed')).toBe(true)
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

  it('does not close on Escape when persistent', async () => {
    el.persistent = true
    el.show()
    await el.updateComplete

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await el.updateComplete

    expect(el.modelValue).toBe(true)
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

  it('renders slotted default content, and mini-slot content only while mini', async () => {
    el.textContent = 'full content'
    expect(el.textContent).toBe('full content')

    const miniSpan = document.createElement('span')
    miniSpan.slot = 'mini'
    miniSpan.textContent = 'icon'
    el.append(miniSpan)
    await el.updateComplete

    const miniWrapper = el.shadowRoot?.querySelector('.cdmt-drawer__mini-slot')
    if (!miniWrapper) throw new Error('expected a mini-slot wrapper to exist')

    expect(getComputedStyle(miniWrapper).display).toBe('none')

    el.mini = true
    await el.updateComplete
    expect(getComputedStyle(miniWrapper).display).toBe('block')
  })

  it('dispatches cdmt-layout-child-change when a metrics-relevant prop changes', async () => {
    const handler = vi.fn()
    el.addEventListener('cdmt-layout-child-change', handler)

    el.overlay = true
    await el.updateComplete

    expect(handler).toHaveBeenCalled()
  })

  it('cdmt-layout-child-change actually bubbles, so a parent layout can hear it', async () => {
    const parent = document.createElement('div')
    document.body.append(parent)
    parent.append(el)
    const handler = vi.fn()
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

  it('does not re-dispatch cdmt-model-value-change when an unrelated property changes', async () => {
    const handler = vi.fn()
    el.addEventListener('cdmt-model-value-change', handler)

    el.bordered = true
    await el.updateComplete

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not recompute width when an unrelated property changes', async () => {
    const widthSetterSpy = vi.spyOn(CSSStyleDeclaration.prototype, 'width', 'set')

    el.bordered = true
    await el.updateComplete

    expect(widthSetterSpy).not.toHaveBeenCalled()
  })

  it('does not re-query matchMedia when an unrelated property changes', async () => {
    const matchMediaSpy = vi.mocked(window.matchMedia)
    matchMediaSpy.mockClear()

    el.bordered = true
    await el.updateComplete

    expect(matchMediaSpy).not.toHaveBeenCalled()
  })

  it('does not re-toggle data-cdmt-fixed or re-notify the layout when an unrelated property changes', async () => {
    const handler = vi.fn()
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
