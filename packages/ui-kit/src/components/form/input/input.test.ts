// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { CdmtInput } from './input.js'

function getInnerInput(el: CdmtInput): HTMLInputElement {
  const input = el.shadowRoot?.querySelector('input')
  if (!input) throw new Error('expected an inner <input> to exist')
  return input
}

describe(CdmtInput, () => {
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

  it('syncs value from a composed native input event', () => {
    const input = getInnerInput(el)

    input.value = 'hello@example.com'
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

    expect(el.value).toBe('hello@example.com')
  })
})
