// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CdmtItem } from './item.js'

type EventHandler = (event: Event) => void

function pressKey(el: CdmtItem, key: string): boolean {
  return el.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }))
}

describe(CdmtItem, () => {
  let el: CdmtItem

  beforeEach(async () => {
    el = document.createElement('cdmt-item')
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

  it('defaults every flag to false, insetLevel to 0, not interactive', () => {
    expect(el.disable).toBe(false)
    expect(el.active).toBe(false)
    expect(el.clickable).toBe(false)
    expect(el.dense).toBe(false)
    expect(el.insetLevel).toBe(0)
    expect(el.manualFocus).toBe(false)
    expect(el.focused).toBe(false)
    expect(el.hasAttribute('role')).toBe(false)
    expect(el.hasAttribute('tabindex')).toBe(false)
    expect(el.style.getPropertyValue('--cdmt-item-inset')).toBe('')
  })

  it('reflects disable/active/clickable/dense/focused as attributes', async () => {
    el.disable = true
    el.active = true
    el.clickable = true
    el.dense = true
    el.focused = true
    await el.updateComplete

    expect(el.hasAttribute('disable')).toBe(true)
    expect(el.hasAttribute('active')).toBe(true)
    expect(el.hasAttribute('clickable')).toBe(true)
    expect(el.hasAttribute('dense')).toBe(true)
    expect(el.hasAttribute('focused')).toBe(true)
  })

  it('sets the --cdmt-item-inset custom property when insetLevel is above 0', async () => {
    el.insetLevel = 2
    await el.updateComplete

    expect(el.style.getPropertyValue('--cdmt-item-inset')).toBe('2')
  })

  it('removes the --cdmt-item-inset custom property when insetLevel goes back to 0', async () => {
    el.insetLevel = 2
    await el.updateComplete

    el.insetLevel = 0
    await el.updateComplete

    expect(el.style.getPropertyValue('--cdmt-item-inset')).toBe('')
  })

  it('becomes a keyboard-focusable button when clickable', async () => {
    el.clickable = true
    await el.updateComplete

    expect(el.getAttribute('role')).toBe('button')
    expect(el.getAttribute('tabindex')).toBe('0')
  })

  // clickable and manual-focus are each set in their *own* update batch
  // (not together) so the manual-focus branch's own effect — actually
  // removing an already-present tabindex — is what the assertion observes,
  // not just "tabindex never existed in the first place, so `removeAttribute`
  // never had anything to do."
  it('is not a tab stop when clickable and manual-focus is set, but keeps the button role', async () => {
    el.clickable = true
    await el.updateComplete

    expect(el.getAttribute('tabindex')).toBe('0')

    el.manualFocus = true
    await el.updateComplete

    expect(el.getAttribute('role')).toBe('button')
    expect(el.hasAttribute('tabindex')).toBe(false)
  })

  // Same reasoning as above: disable is set in its own update batch, after
  // clickable already made the element interactive, so the assertion
  // observes disable's own effect actually turning interactivity back off —
  // not clickable's OR-clause alone already producing the same result.
  it('is not interactive when disable is set, even if clickable is also set', async () => {
    el.clickable = true
    await el.updateComplete

    expect(el.getAttribute('role')).toBe('button')

    el.disable = true
    await el.updateComplete

    expect(el.hasAttribute('role')).toBe(false)
    expect(el.hasAttribute('tabindex')).toBe(false)
  })

  it('does not touch the inset custom property when an unrelated property changes', async () => {
    const setSpy = vi.spyOn(el.style, 'setProperty')
    const removeSpy = vi.spyOn(el.style, 'removeProperty')

    el.active = true
    await el.updateComplete

    expect(setSpy).not.toHaveBeenCalledWith('--cdmt-item-inset', expect.anything())
    expect(removeSpy).not.toHaveBeenCalledWith('--cdmt-item-inset')
  })

  it('stops being interactive when clickable is turned back off', async () => {
    el.clickable = true
    await el.updateComplete

    expect(el.getAttribute('role')).toBe('button')

    el.clickable = false
    await el.updateComplete

    expect(el.hasAttribute('role')).toBe(false)
    expect(el.hasAttribute('tabindex')).toBe(false)
  })

  it('does not touch role/tabindex when an unrelated property changes', async () => {
    const setSpy = vi.spyOn(el, 'setAttribute')
    const removeSpy = vi.spyOn(el, 'removeAttribute')

    el.active = true
    await el.updateComplete

    expect(setSpy).not.toHaveBeenCalledWith('role', expect.anything())
    expect(removeSpy).not.toHaveBeenCalledWith('role')
  })

  it('triggers a click via Enter when clickable', async () => {
    el.clickable = true
    await el.updateComplete
    const handler = vi.fn<EventHandler>()
    el.addEventListener('click', handler)

    pressKey(el, 'Enter')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('triggers a click via Space when clickable', async () => {
    el.clickable = true
    await el.updateComplete
    const handler = vi.fn<EventHandler>()
    el.addEventListener('click', handler)

    pressKey(el, ' ')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('prevents the default action for Enter/Space when clickable', async () => {
    el.clickable = true
    await el.updateComplete

    expect(pressKey(el, 'Enter')).toBe(false)
  })

  it('ignores every other key when clickable', async () => {
    el.clickable = true
    await el.updateComplete
    const handler = vi.fn<EventHandler>()
    el.addEventListener('click', handler)

    pressKey(el, 'Tab')

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not trigger a click on Enter/Space when not clickable', () => {
    const handler = vi.fn<EventHandler>()
    el.addEventListener('click', handler)

    pressKey(el, 'Enter')

    expect(handler).not.toHaveBeenCalled()
  })

  it('does not trigger a click on Enter/Space when clickable but disabled', async () => {
    el.clickable = true
    el.disable = true
    await el.updateComplete
    const handler = vi.fn<EventHandler>()
    el.addEventListener('click', handler)

    pressKey(el, 'Enter')

    expect(handler).not.toHaveBeenCalled()
  })

  it('stops reacting to keydown after being disconnected', async () => {
    el.clickable = true
    await el.updateComplete
    el.remove()

    const handler = vi.fn<EventHandler>()
    el.addEventListener('click', handler)
    pressKey(el, 'Enter')

    expect(handler).not.toHaveBeenCalled()
  })
})
