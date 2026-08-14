// @vitest-environment happy-dom

import '@codeminity/ui-kit-core'

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import type { CdmtButton as CdmtButtonElement } from '@codeminity/ui-kit-core'

import { CdmtButton } from './CdmtButton.js'

describe('CdmtButton', () => {
  it('renders a cdmt-button element', () => {
    const wrapper = mount(CdmtButton)
    const el = wrapper.element as unknown as CdmtButtonElement

    expect(el.tagName.toLowerCase()).toBe('cdmt-button')
  })

  it('forwards slot content', () => {
    const wrapper = mount(CdmtButton, { slots: { default: 'Save' } })

    expect(wrapper.text()).toBe('Save')
  })

  it('defaults to the primary variant, not disabled', async () => {
    const wrapper = mount(CdmtButton, { attachTo: document.body })
    const el = wrapper.element as unknown as CdmtButtonElement

    await el.updateComplete

    expect(el.getAttribute('variant')).toBe('primary')
    expect(el.hasAttribute('disabled')).toBe(false)
  })

  it('passes variant and disabled through to the underlying element', async () => {
    const wrapper = mount(CdmtButton, {
      attachTo: document.body,
      props: { variant: 'ghost', disabled: true }
    })
    const el = wrapper.element as unknown as CdmtButtonElement

    await el.updateComplete

    expect(el.getAttribute('variant')).toBe('ghost')
    expect(el.hasAttribute('disabled')).toBe(true)
  })

  it('lets a plain @click handler work — no wrapper-side translation needed', async () => {
    const onClick = vi.fn()
    const wrapper = mount(CdmtButton, {
      attachTo: document.body,
      attrs: { onClick }
    })

    await wrapper.trigger('click')

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
