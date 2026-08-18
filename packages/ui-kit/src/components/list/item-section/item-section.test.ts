// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import './item-section.js'

import type { CdmtItemSection } from './item-section.js'

describe('CdmtItemSection', () => {
  let el: CdmtItemSection

  beforeEach(async () => {
    el = document.createElement('cdmt-item-section')
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

  it('defaults every flag to false', () => {
    expect(el.avatar).toBe(false)
    expect(el.thumbnail).toBe(false)
    expect(el.side).toBe(false)
    expect(el.top).toBe(false)
    expect(el.noWrap).toBe(false)
  })

  it('reflects avatar/thumbnail/side/top as attributes', async () => {
    el.avatar = true
    el.thumbnail = true
    el.side = true
    el.top = true
    await el.updateComplete

    expect(el.hasAttribute('avatar')).toBe(true)
    expect(el.hasAttribute('thumbnail')).toBe(true)
    expect(el.hasAttribute('side')).toBe(true)
    expect(el.hasAttribute('top')).toBe(true)
  })

  it('reflects noWrap as a no-wrap attribute', async () => {
    el.noWrap = true
    await el.updateComplete

    expect(el.hasAttribute('no-wrap')).toBe(true)
    expect(el.hasAttribute('noWrap')).toBe(false)
  })
})
