// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../../index.js'

import { CdmtInput } from './CdmtInput.js'

import type { CdmtInput as CdmtInputElement } from '../../../../components/form/input/input.js'

function getInnerInput(el: CdmtInputElement): HTMLInputElement {
  const input = el.shadowRoot?.querySelector('input')
  if (!input) throw new Error('expected an inner <input> to exist')
  return input
}

describe('cdmtInput (Vue)', () => {
  it('renders a cdmt-input element', () => {
    const wrapper = mount(CdmtInput, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtInputElement

    expect(element.tagName.toLowerCase()).toBe('cdmt-input')
  })

  it('passes modelValue through as the controlled value', async () => {
    const wrapper = mount(CdmtInput, { props: { modelValue: 'hi' }, attachTo: document.body })
    const element = wrapper.element as unknown as CdmtInputElement
    await wrapper.vm.$nextTick()

    expect(element.value).toBe('hi')
  })

  it('passes type/placeholder/disabled/invalid through', async () => {
    const wrapper = mount(CdmtInput, {
      props: { type: 'email', placeholder: 'you@example.com', disabled: true, invalid: true },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtInputElement
    await element.updateComplete

    expect(element.getAttribute('type')).toBe('email')
    expect(element.placeholder).toBe('you@example.com')
    expect(element.hasAttribute('disabled')).toBe(true)
    expect(element.hasAttribute('invalid')).toBe(true)
  })

  it('emits update:modelValue with a real value bound through v-model semantics', async () => {
    const wrapper = mount(CdmtInput, { props: { modelValue: '' }, attachTo: document.body })
    const element = wrapper.element as unknown as CdmtInputElement
    await wrapper.vm.$nextTick()

    const input = getInnerInput(element)
    input.value = 'typed@example.com'
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

    expect(wrapper.emitted('update:modelValue')?.[0]).toStrictEqual(['typed@example.com'])
  })
})
