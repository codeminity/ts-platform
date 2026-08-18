// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import './header.js'

import type { CdmtHeader } from './header.js'

function scrollTo(position: number): void {
  Object.defineProperty(window, 'scrollY', { value: position, configurable: true })
  window.dispatchEvent(new Event('scroll'))
}

describe('CdmtHeader', () => {
  let el: CdmtHeader

  beforeEach(async () => {
    el = document.createElement('cdmt-header')
    document.body.append(el)
    await el.updateComplete
  })

  afterEach(() => {
    scrollTo(0)
    vi.restoreAllMocks()
  })

  it('renders a default slot in its shadow root that actually distributes light-DOM content', () => {
    expect(el.shadowRoot?.querySelector('slot')).not.toBeNull()

    el.textContent = 'content'
    const slot = el.shadowRoot?.querySelector('slot')
    const assigned = slot
      ?.assignedNodes()
      .map((node) => node.textContent)
      .join('')
    expect(assigned).toBe('content')
  })

  it('defaults to visible, not reveal, not bordered/elevated, revealOffset 250, heightHint 50', () => {
    expect(el.modelValue).toBe(true)
    expect(el.reveal).toBe(false)
    expect(el.bordered).toBe(false)
    expect(el.elevated).toBe(false)
    expect(el.revealOffset).toBe(250)
    expect(el.heightHint).toBe(50)
    expect(el.hasAttribute('hidden')).toBe(false)
  })

  it('reflects bordered/elevated as attributes', async () => {
    el.bordered = true
    el.elevated = true
    await el.updateComplete

    expect(el.hasAttribute('bordered')).toBe(true)
    expect(el.hasAttribute('elevated')).toBe(true)
  })

  it('hides via the hidden attribute when model-value is false', async () => {
    el.modelValue = false
    await el.updateComplete

    expect(el.hasAttribute('hidden')).toBe(true)
  })

  it('does not react to scroll when reveal is off', () => {
    scrollTo(1000)
    scrollTo(500)

    expect(el.hasAttribute('data-cdmt-revealed')).toBe(false)
  })

  it('stays revealed below revealOffset regardless of scroll direction', async () => {
    el.reveal = true
    await el.updateComplete

    scrollTo(100)

    expect(el.getAttribute('data-cdmt-revealed')).toBe('true')
  })

  it('hides on scroll-down past revealOffset, in reveal mode', async () => {
    el.reveal = true
    await el.updateComplete

    scrollTo(400)

    expect(el.getAttribute('data-cdmt-revealed')).toBe('false')
  })

  it('does nothing (no reveal-state change) when scroll position is unchanged, from a revealed state past revealOffset', async () => {
    el.reveal = true
    await el.updateComplete
    scrollTo(400) // delta > 0, past revealOffset -> hidden
    scrollTo(350) // delta < 0, still past revealOffset -> revealed

    const handler = vi.fn()
    el.addEventListener('cdmt-reveal', handler)
    scrollTo(350) // delta === 0, still past revealOffset -> must stay revealed

    expect(handler).not.toHaveBeenCalled()
    expect(el.getAttribute('data-cdmt-revealed')).toBe('true')
  })

  it('treats a position exactly at revealOffset as NOT below it (boundary is exclusive)', async () => {
    el.reveal = true
    await el.updateComplete

    scrollTo(200) // < revealOffset -> revealed (the "near top" zone)
    expect(el.getAttribute('data-cdmt-revealed')).toBe('true')

    // delta = +50 (scrolling down), landing exactly ON revealOffset. If
    // `position < revealOffset` were `<=`, this position alone would force
    // revealed=true regardless of the downward delta — it must not; the
    // delta>0 fallback should hide it instead.
    scrollTo(250)
    expect(el.getAttribute('data-cdmt-revealed')).toBe('false')
  })

  it('reappears on scroll-up past revealOffset, in reveal mode', async () => {
    el.reveal = true
    await el.updateComplete

    scrollTo(400)
    scrollTo(350)

    expect(el.getAttribute('data-cdmt-revealed')).toBe('true')
  })

  it('stays revealed on a zero-delta scroll past revealOffset (delta>0 must be strict)', async () => {
    el.reveal = true
    await el.updateComplete

    scrollTo(400) // delta > 0, past revealOffset -> hidden
    scrollTo(350) // delta < 0 -> revealed

    // delta === 0 here — if `delta > 0` were `delta >= 0`, this would
    // incorrectly hide it again.
    scrollTo(350)
    expect(el.getAttribute('data-cdmt-revealed')).toBe('true')
  })

  it('stays hidden on a zero-delta scroll past revealOffset (delta<0 must be strict)', async () => {
    el.reveal = true
    await el.updateComplete

    scrollTo(400) // delta > 0, past revealOffset -> hidden

    // delta === 0 here — if `delta < 0` were `delta <= 0`, this would
    // incorrectly reveal it.
    scrollTo(400)
    expect(el.getAttribute('data-cdmt-revealed')).toBe('false')
  })

  it('dispatches cdmt-reveal with the new state on a real reveal-state change', async () => {
    el.reveal = true
    await el.updateComplete
    const handler = vi.fn()
    el.addEventListener('cdmt-reveal', handler)

    scrollTo(400)

    expect(handler).toHaveBeenCalledTimes(1)
    expect((handler.mock.calls[0]?.[0] as CustomEvent).detail).toBe(false)
  })

  it('does not dispatch cdmt-reveal again for a redundant same-direction scroll', async () => {
    el.reveal = true
    await el.updateComplete
    scrollTo(400)

    const handler = vi.fn()
    el.addEventListener('cdmt-reveal', handler)
    scrollTo(450)

    expect(handler).not.toHaveBeenCalled()
  })

  it('stops reacting to scroll once reveal is turned off, and clears the revealed state', async () => {
    el.reveal = true
    await el.updateComplete
    scrollTo(400)
    expect(el.hasAttribute('data-cdmt-revealed')).toBe(true)

    el.reveal = false
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-revealed')).toBe(false)

    scrollTo(0)
    scrollTo(400)
    expect(el.hasAttribute('data-cdmt-revealed')).toBe(false)
  })

  it('starts listening for scroll immediately when connected with reveal already true', async () => {
    const preConfigured = document.createElement('cdmt-header')
    preConfigured.reveal = true
    document.body.append(preConfigured)
    await preConfigured.updateComplete

    scrollTo(400)

    expect(preConfigured.getAttribute('data-cdmt-revealed')).toBe('false')
    preConfigured.remove()
  })

  it('stops listening for scroll after being disconnected', async () => {
    el.reveal = true
    await el.updateComplete
    el.remove()

    scrollTo(400)

    expect(el.hasAttribute('data-cdmt-revealed')).toBe(false)
  })

  it('attaches the scroll listener with the exact event type and a passive option', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')

    const fresh = document.createElement('cdmt-header')
    fresh.reveal = true
    document.body.append(fresh)
    await fresh.updateComplete

    expect(addSpy).toHaveBeenCalledWith('scroll', expect.anything(), { passive: true })
    fresh.remove()
  })

  it('removes the exact same scroll listener reference on disconnect', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    el.reveal = true
    await el.updateComplete

    const addCall = addSpy.mock.calls.find((call) => call[0] === 'scroll')

    el.remove()

    expect(removeSpy).toHaveBeenCalledWith('scroll', addCall?.[1])
  })

  it('does not toggle hidden again when an unrelated property changes', async () => {
    const toggleSpy = vi.spyOn(el, 'toggleAttribute')

    el.bordered = true
    await el.updateComplete

    expect(toggleSpy).not.toHaveBeenCalledWith('hidden', expect.anything())
  })

  it('does not touch the scroll listener when an unrelated property changes', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    el.bordered = true
    await el.updateComplete

    expect(addSpy).not.toHaveBeenCalled()
    expect(removeSpy).not.toHaveBeenCalled()
  })
})
