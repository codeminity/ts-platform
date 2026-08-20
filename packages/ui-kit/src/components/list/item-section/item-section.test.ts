// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { CdmtItemSection } from './item-section.js'

describe(CdmtItemSection, () => {
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
})
