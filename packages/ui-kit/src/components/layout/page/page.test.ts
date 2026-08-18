// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import './page.js'

import type { CdmtPage } from './page.js'

describe('CdmtPage', () => {
  let el: CdmtPage

  beforeEach(async () => {
    el = document.createElement('cdmt-page')
    document.body.append(el)
    await el.updateComplete
  })

  it('defaults to padding false and no styleFn', () => {
    expect(el.padding).toBe(false)
    expect(el.styleFn).toBeUndefined()
  })

  it('reflects padding as an attribute', async () => {
    el.padding = true
    await el.updateComplete

    expect(el.hasAttribute('padding')).toBe(true)
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

  it('does not recompute styleFn when an unrelated property changes', async () => {
    const styleFn = vi.fn(() => ({ minHeight: '10px' }))
    el.styleFn = styleFn
    await el.updateComplete
    expect(styleFn).toHaveBeenCalledTimes(1)

    el.padding = true
    await el.updateComplete

    expect(styleFn).toHaveBeenCalledTimes(1)
  })

  it('applies a computed inline style from styleFn, given the current layout offset', async () => {
    el.style.setProperty('--cdmt-layout-header-height', '64px')
    el.style.setProperty('--cdmt-layout-footer-height', '32px')

    el.styleFn = (offset) => ({ minHeight: `${String(offset + 10)}px` })
    await el.updateComplete

    expect(el.style.getPropertyValue('min-height')).toBe('106px')
  })

  it('treats a missing/non-numeric layout offset as 0', async () => {
    el.styleFn = (offset) => ({ minHeight: `${String(offset)}px` })
    await el.updateComplete

    expect(el.style.getPropertyValue('min-height')).toBe('0px')
  })

  it('removes the inline min-height when styleFn is cleared, falling back to the default CSS', async () => {
    el.styleFn = () => ({ minHeight: '999px' })
    await el.updateComplete
    expect(el.style.getPropertyValue('min-height')).toBe('999px')

    el.styleFn = undefined
    await el.updateComplete

    expect(el.style.getPropertyValue('min-height')).toBe('')
  })

  it('converts a camelCase styleFn key to a kebab-case CSS property', async () => {
    el.styleFn = () => ({ backgroundColor: 'red' })
    await el.updateComplete

    expect(el.style.getPropertyValue('background-color')).toBe('red')
  })
})
