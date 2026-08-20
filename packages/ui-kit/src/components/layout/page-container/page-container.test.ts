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

  it('renders a cdmt-page-container element', () => {
    expect(el.tagName.toLowerCase()).toBe('cdmt-page-container')
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

  it('applies no padding of its own by default — offsetting is entirely owned by <cdmt-layout>', () => {
    // <cdmt-layout> sets padding-top/bottom/left/right directly as an
    // inline style (see CdmtLayout#recomputeOffsets) rather than this
    // component reading a var() itself — a standalone <cdmt-page-container>
    // used outside a <cdmt-layout> has no offset of its own to apply.
    expect(el.style.paddingTop).toBe('')
    expect(el.style.paddingBottom).toBe('')
    expect(el.style.paddingLeft).toBe('')
    expect(el.style.paddingRight).toBe('')
  })

  it('reflects whatever padding a parent sets directly as an inline style', async () => {
    el.style.paddingTop = '64px'
    el.style.paddingLeft = '300px'
    await el.updateComplete

    const styles = getComputedStyle(el)

    expect(styles.paddingTop).toBe('64px')
    expect(styles.paddingLeft).toBe('300px')
  })
})
