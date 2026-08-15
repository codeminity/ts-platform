// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import './button.js'

import type { CdmtButton } from './button.js'

describe('CdmtButton', () => {
  let el: CdmtButton

  beforeEach(async () => {
    el = document.createElement('cdmt-button')
    document.body.append(el)
    await el.updateComplete
  })

  it('defaults to variant primary and not disabled', () => {
    expect(el.variant).toBe('primary')
    expect(el.disabled).toBe(false)
  })

  it('reflects variant as an attribute', async () => {
    el.variant = 'ghost'
    await el.updateComplete

    expect(el.getAttribute('variant')).toBe('ghost')
  })

  it('reflects disabled as an attribute', async () => {
    el.disabled = true
    await el.updateComplete

    expect(el.hasAttribute('disabled')).toBe(true)
  })

  it('disables the inner native button', async () => {
    el.disabled = true
    await el.updateComplete

    const button = el.shadowRoot?.querySelector('button')
    expect(button?.disabled).toBe(true)
  })

  it('renders slotted content', () => {
    el.textContent = 'Save'
    expect(el.textContent).toBe('Save')
  })

  it('forwards a native click from the inner button', () => {
    let clicked = false
    el.addEventListener('click', () => {
      clicked = true
    })

    const button = el.shadowRoot?.querySelector('button')
    button?.click()

    expect(clicked).toBe(true)
  })
})
