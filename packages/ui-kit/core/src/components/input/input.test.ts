// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest'

import './input.js'

import type { CdmtInput } from './input.js'

async function renderInput(attrs = ''): Promise<CdmtInput> {
  document.body.innerHTML = `<cdmt-input ${attrs}></cdmt-input>`

  const el = document.querySelector('cdmt-input')

  if (!el) {
    throw new Error('cdmt-input did not render')
  }

  await el.updateComplete

  return el
}

describe('cdmt-input', () => {
  it('defaults to an empty text input, not disabled or invalid', async () => {
    const el = await renderInput()

    expect(el.value).toBe('')
    expect(el.type).toBe('text')
    expect(el.placeholder).toBe('')
    expect(el.disabled).toBe(false)
    expect(el.invalid).toBe(false)
  })

  it('renders the placeholder on the inner input', async () => {
    const el = await renderInput('placeholder="Email"')
    const inner = el.shadowRoot?.querySelector('input')

    expect(inner?.placeholder).toBe('Email')
  })

  it('reflects type, disabled, and invalid to attributes', async () => {
    const el = await renderInput('type="password" disabled invalid')

    expect(el.getAttribute('type')).toBe('password')
    expect(el.getAttribute('disabled')).not.toBeNull()
    expect(el.getAttribute('invalid')).not.toBeNull()
  })

  it('disables the inner input when the disabled property is set', async () => {
    const el = await renderInput('disabled')
    const inner = el.shadowRoot?.querySelector('input')

    expect(inner?.disabled).toBe(true)
  })

  it('updates the value property and fires a composed input event when the user types', async () => {
    const el = await renderInput()
    const inner = el.shadowRoot?.querySelector('input')

    if (!inner) {
      throw new Error('inner input did not render')
    }

    const handler = vi.fn()
    el.addEventListener('input', handler)

    inner.value = 'hello'
    inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

    expect(el.value).toBe('hello')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('reflects an externally set value onto the inner input', async () => {
    const el = await renderInput()

    el.value = 'set externally'
    await el.updateComplete

    const inner = el.shadowRoot?.querySelector('input')

    expect(inner?.value).toBe('set externally')
  })
})
