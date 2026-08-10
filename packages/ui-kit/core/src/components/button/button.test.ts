// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest'

import './button.js'

import type { CdmtButton } from './button.js'

async function renderButton(attrs = ''): Promise<CdmtButton> {
  document.body.innerHTML = `<cdmt-button ${attrs}>Click me</cdmt-button>`

  const el = document.querySelector('cdmt-button')

  if (!el) {
    throw new Error('cdmt-button did not render')
  }

  await el.updateComplete

  return el
}

describe('cdmt-button', () => {
  it('renders its slotted content', async () => {
    const el = await renderButton()

    expect(el.textContent.trim()).toBe('Click me')
  })

  it('defaults to the primary variant, not disabled', async () => {
    const el = await renderButton()

    expect(el.variant).toBe('primary')
    expect(el.disabled).toBe(false)
  })

  it('reflects the variant property to an attribute', async () => {
    const el = await renderButton('variant="ghost"')

    expect(el.variant).toBe('ghost')
    expect(el.getAttribute('variant')).toBe('ghost')
  })

  it('disables the inner button when the disabled property is set', async () => {
    const el = await renderButton('disabled')
    const inner = el.shadowRoot?.querySelector('button')

    expect(inner?.disabled).toBe(true)
  })

  it('fires a click event when clicked while enabled', async () => {
    const el = await renderButton()
    const handler = vi.fn()

    el.addEventListener('click', handler)
    el.shadowRoot?.querySelector('button')?.click()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not fire a click event when clicked while disabled', async () => {
    const el = await renderButton('disabled')
    const handler = vi.fn()

    el.addEventListener('click', handler)
    el.shadowRoot?.querySelector('button')?.click()

    expect(handler).not.toHaveBeenCalled()
  })
})
