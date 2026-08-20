// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { CdmtButton } from './button.js'

describe(CdmtButton, () => {
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
