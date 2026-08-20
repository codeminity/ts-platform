// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { CdmtPageContainer } from './page-container.js'

describe(CdmtPageContainer, () => {
  let el: CdmtPageContainer

  beforeEach(async () => {
    el = document.createElement('cdmt-page-container')
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
})
