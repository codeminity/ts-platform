// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import './input.js'

import type { CdmtInput } from './input.js'

function getInnerInput(el: CdmtInput): HTMLInputElement {
  const input = el.shadowRoot?.querySelector('input')
  if (!input) throw new Error('expected an inner <input> to exist')
  return input
}

describe('CdmtInput', () => {
  let el: CdmtInput

  beforeEach(async () => {
    el = document.createElement('cdmt-input')
    document.body.append(el)
    await el.updateComplete
  })

  it('defaults value/type/placeholder/disabled/invalid', () => {
    expect(el.value).toBe('')
    expect(el.type).toBe('text')
    expect(el.placeholder).toBe('')
    expect(el.disabled).toBe(false)
    expect(el.invalid).toBe(false)
  })

  it('renders the placeholder on the inner native input', async () => {
    el.placeholder = 'Email'
    await el.updateComplete

    const input = el.shadowRoot?.querySelector('input')
    expect(input?.placeholder).toBe('Email')
  })

  it('reflects type/disabled/invalid as attributes', async () => {
    el.type = 'email'
    el.disabled = true
    el.invalid = true
    await el.updateComplete

    expect(el.getAttribute('type')).toBe('email')
    expect(el.hasAttribute('disabled')).toBe(true)
    expect(el.hasAttribute('invalid')).toBe(true)
  })

  it('disables the inner native input', async () => {
    el.disabled = true
    await el.updateComplete

    const input = el.shadowRoot?.querySelector('input')
    expect(input?.disabled).toBe(true)
  })

  it('syncs value from a composed native input event', () => {
    const input = getInnerInput(el)

    input.value = 'hello@example.com'
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

    expect(el.value).toBe('hello@example.com')
  })

  it('reflects an externally-set value to the inner native input', async () => {
    el.value = 'preset@example.com'
    await el.updateComplete

    const input = el.shadowRoot?.querySelector('input')
    expect(input?.value).toBe('preset@example.com')
  })
})
