// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import './item-label.js'

import type { CdmtItemLabel } from './item-label.js'

describe('CdmtItemLabel', () => {
  let el: CdmtItemLabel

  beforeEach(async () => {
    el = document.createElement('cdmt-item-label')
    document.body.append(el)
    await el.updateComplete
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

  it('defaults every flag to false and lines to 0 (never clamped)', () => {
    expect(el.overline).toBe(false)
    expect(el.caption).toBe(false)
    expect(el.header).toBe(false)
    expect(el.lines).toBe(0)
    expect(el.style.display).toBe('')
  })

  it('reflects overline/caption/header as attributes', async () => {
    el.overline = true
    el.caption = true
    el.header = true
    await el.updateComplete

    expect(el.hasAttribute('overline')).toBe(true)
    expect(el.hasAttribute('caption')).toBe(true)
    expect(el.hasAttribute('header')).toBe(true)
  })

  // `display`'s own *resulting value* is deliberately not read back via
  // `getPropertyValue` here: happy-dom's CSSStyleDeclaration rejects
  // `-webkit-box` outright, even via `setProperty` (confirmed directly —
  // the value never even reaches the style attribute), since it validates
  // against a known `display` keyword set that legacy vendor-prefixed
  // values aren't part of. Real browsers (Playwright's own real-Chromium
  // e2e specs) accept it correctly. The exact `setProperty`/`removeProperty`
  // *call* is still verified via a spy, which happy-dom's validation has no
  // way to intercept — proving the component asked for the right thing,
  // even though this environment can't reflect back what it did with it.
  it('applies webkit line-clamp inline styles when lines is set above 0', async () => {
    const setSpy = vi.spyOn(el.style, 'setProperty')

    el.lines = 2
    await el.updateComplete

    expect(setSpy).toHaveBeenCalledWith('display', '-webkit-box')
    expect(el.style.getPropertyValue('overflow')).toBe('hidden')
    expect(el.style.getPropertyValue('-webkit-line-clamp')).toBe('2')
    expect(el.style.getPropertyValue('-webkit-box-orient')).toBe('vertical')
  })

  it('removes the clamp styles again when lines goes back to 0', async () => {
    el.lines = 2
    await el.updateComplete
    const removeSpy = vi.spyOn(el.style, 'removeProperty')

    el.lines = 0
    await el.updateComplete

    expect(removeSpy).toHaveBeenCalledWith('display')
    expect(el.style.overflow).toBe('')
    expect(el.style.getPropertyValue('-webkit-line-clamp')).toBe('')
    expect(el.style.getPropertyValue('-webkit-box-orient')).toBe('')
  })

  it('does not touch inline styles when an unrelated property changes', async () => {
    el.lines = 2
    await el.updateComplete
    const setSpy = vi.spyOn(el.style, 'setProperty')
    const removeSpy = vi.spyOn(el.style, 'removeProperty')

    el.header = true
    await el.updateComplete

    expect(setSpy).not.toHaveBeenCalled()
    expect(removeSpy).not.toHaveBeenCalled()
    expect(el.style.getPropertyValue('-webkit-line-clamp')).toBe('2')
  })
})
