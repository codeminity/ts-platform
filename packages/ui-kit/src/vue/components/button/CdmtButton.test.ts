// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../index.js'

import { CdmtButton } from './CdmtButton.js'

import type { CdmtButton as CdmtButtonElement } from '../../../components/button/button.js'

describe('cdmtButton (Vue)', () => {
  it('renders a cdmt-button element', () => {
    const wrapper = mount(CdmtButton, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtButtonElement

    expect(element.tagName.toLowerCase()).toBe('cdmt-button')
  })

  it('defaults variant to primary', async () => {
    const wrapper = mount(CdmtButton, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtButtonElement
    await element.updateComplete

    expect(element.getAttribute('variant')).toBe('primary')
  })

  it('passes the variant prop through', async () => {
    const wrapper = mount(CdmtButton, { props: { variant: 'ghost' }, attachTo: document.body })
    const element = wrapper.element as unknown as CdmtButtonElement
    await element.updateComplete

    expect(element.getAttribute('variant')).toBe('ghost')
  })

  it('passes the disabled prop through', async () => {
    const wrapper = mount(CdmtButton, { props: { disabled: true }, attachTo: document.body })
    const element = wrapper.element as unknown as CdmtButtonElement
    await element.updateComplete

    expect(element.hasAttribute('disabled')).toBe(true)
  })

  it('forwards the default slot as content', () => {
    const wrapper = mount(CdmtButton, {
      slots: { default: 'Save' },
      attachTo: document.body
    })

    expect(wrapper.text()).toBe('Save')
  })

  it('forwards a native @click with no wrapper-side translation', async () => {
    const wrapper = mount(CdmtButton, { attachTo: document.body })
    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
