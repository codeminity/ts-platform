// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import './footer.js'

import type { CdmtFooter } from './footer.js'

function scrollTo(position: number): void {
  Object.defineProperty(window, 'scrollY', { value: position, configurable: true })
  window.dispatchEvent(new Event('scroll'))
}

describe('CdmtFooter', () => {
  let el: CdmtFooter

  beforeEach(async () => {
    el = document.createElement('cdmt-footer')
    document.body.append(el)
    await el.updateComplete
    scrollTo(0)
  })

  afterEach(() => {
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

  it('defaults to visible, not reveal, not bordered/elevated, heightHint 50', () => {
    expect(el.modelValue).toBe(true)
    expect(el.reveal).toBe(false)
    expect(el.bordered).toBe(false)
    expect(el.elevated).toBe(false)
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

  it('hides on scroll-down, in reveal mode, with no offset threshold', async () => {
    el.reveal = true
    await el.updateComplete

    scrollTo(50)

    expect(el.getAttribute('data-cdmt-revealed')).toBe('false')
  })

  it('does nothing (no reveal-state change) when scroll position is unchanged, from a revealed state', async () => {
    el.reveal = true
    await el.updateComplete
    scrollTo(100) // delta > 0 -> hidden
    scrollTo(50) // delta < 0 -> revealed

    const handler = vi.fn()
    el.addEventListener('cdmt-reveal', handler)
    scrollTo(50) // delta === 0 -> must stay revealed, not flip to hidden

    expect(handler).not.toHaveBeenCalled()
    expect(el.getAttribute('data-cdmt-revealed')).toBe('true')
  })

  it('does nothing (no reveal-state change) when scroll position is unchanged, from a hidden state', async () => {
    el.reveal = true
    await el.updateComplete
    scrollTo(50) // delta > 0 -> hidden

    const handler = vi.fn()
    el.addEventListener('cdmt-reveal', handler)
    scrollTo(50) // delta === 0 -> must stay hidden, not flip to revealed

    expect(handler).not.toHaveBeenCalled()
    expect(el.getAttribute('data-cdmt-revealed')).toBe('false')
  })

  it('reappears on scroll-up, in reveal mode', async () => {
    el.reveal = true
    await el.updateComplete

    scrollTo(400)
    scrollTo(350)

    expect(el.getAttribute('data-cdmt-revealed')).toBe('true')
  })

  it('dispatches cdmt-reveal with the new state on a real reveal-state change', async () => {
    el.reveal = true
    await el.updateComplete
    const handler = vi.fn()
    el.addEventListener('cdmt-reveal', handler)

    scrollTo(50)

    expect(handler).toHaveBeenCalledTimes(1)
    expect((handler.mock.calls[0]?.[0] as CustomEvent).detail).toBe(false)
  })

  it('does not dispatch cdmt-reveal again for a redundant same-direction (hiding) scroll', async () => {
    el.reveal = true
    await el.updateComplete
    scrollTo(50)

    const handler = vi.fn()
    el.addEventListener('cdmt-reveal', handler)
    scrollTo(100)

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not dispatch cdmt-reveal again for a redundant same-direction (revealing) scroll', async () => {
    el.reveal = true
    await el.updateComplete
    scrollTo(100) // delta > 0 -> hidden
    scrollTo(50) // delta < 0 -> revealed

    const handler = vi.fn()
    el.addEventListener('cdmt-reveal', handler)
    scrollTo(0) // delta < 0 again -> still revealed, already was

    expect(handler).not.toHaveBeenCalled()
  })

  it('stops reacting to scroll once reveal is turned off, and clears the revealed state', async () => {
    el.reveal = true
    await el.updateComplete
    scrollTo(50)
    expect(el.hasAttribute('data-cdmt-revealed')).toBe(true)

    el.reveal = false
    await el.updateComplete

    expect(el.hasAttribute('data-cdmt-revealed')).toBe(false)

    scrollTo(0)
    scrollTo(50)
    expect(el.hasAttribute('data-cdmt-revealed')).toBe(false)
  })

  it('starts listening for scroll immediately when connected with reveal already true', async () => {
    const preConfigured = document.createElement('cdmt-footer')
    preConfigured.reveal = true
    document.body.append(preConfigured)
    await preConfigured.updateComplete

    scrollTo(50)

    expect(preConfigured.getAttribute('data-cdmt-revealed')).toBe('false')
    preConfigured.remove()
  })

  it('stops listening for scroll after being disconnected', async () => {
    el.reveal = true
    await el.updateComplete
    el.remove()

    scrollTo(50)

    expect(el.hasAttribute('data-cdmt-revealed')).toBe(false)
  })

  it('attaches the scroll listener with the exact event type and a passive option', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')

    const fresh = document.createElement('cdmt-footer')
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
