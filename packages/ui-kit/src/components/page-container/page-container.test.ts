// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import './page-container.js'

import type { CdmtPageContainer } from './page-container.js'

describe('CdmtPageContainer', () => {
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

  it('offsets from the layout header/footer/drawer CSS vars via padding', async () => {
    el.style.setProperty('--cdmt-layout-header-height', '64px')
    el.style.setProperty('--cdmt-layout-footer-height', '48px')
    el.style.setProperty('--cdmt-layout-drawer-left-width', '300px')
    el.style.setProperty('--cdmt-layout-drawer-right-width', '0px')
    await el.updateComplete

    const styles = getComputedStyle(el)
    expect(styles.paddingTop).toBe('64px')
    expect(styles.paddingBottom).toBe('48px')
    expect(styles.paddingLeft).toBe('300px')
    expect(styles.paddingRight).toBe('0px')
  })

  it('defaults every offset to 0 when no layout vars are set', () => {
    const styles = getComputedStyle(el)
    expect(styles.paddingTop).toBe('0px')
    expect(styles.paddingBottom).toBe('0px')
    expect(styles.paddingLeft).toBe('0px')
    expect(styles.paddingRight).toBe('0px')
  })
})
