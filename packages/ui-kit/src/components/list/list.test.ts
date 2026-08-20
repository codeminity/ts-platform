// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { CdmtList } from './list.js'

describe(CdmtList, () => {
  let el: CdmtList

  beforeEach(async () => {
    el = document.createElement('cdmt-list')
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
    expect(el.bordered).toBe(false)
    expect(el.dense).toBe(false)
    expect(el.separator).toBe(false)
    expect(el.padding).toBe(false)
  })

  it('reflects bordered/dense/separator/padding as attributes', async () => {
    el.bordered = true
    el.dense = true
    el.separator = true
    el.padding = true
    await el.updateComplete

    expect(el.hasAttribute('bordered')).toBe(true)
    expect(el.hasAttribute('dense')).toBe(true)
    expect(el.hasAttribute('separator')).toBe(true)
    expect(el.hasAttribute('padding')).toBe(true)
  })
})
