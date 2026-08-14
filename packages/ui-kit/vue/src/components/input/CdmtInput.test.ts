// @vitest-environment happy-dom

import '@codeminity/ui-kit-core'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { CdmtInput as CdmtInputElement } from '@codeminity/ui-kit-core'

import { CdmtInput } from './CdmtInput.js'

describe('CdmtInput', () => {
  it('renders a cdmt-input element', () => {
    const wrapper = mount(CdmtInput)
    const el = wrapper.element as unknown as CdmtInputElement

    expect(el.tagName.toLowerCase()).toBe('cdmt-input')
  })

  it('passes modelValue and props through to the underlying element', async () => {
    const wrapper = mount(CdmtInput, {
      // Lit's update cycle (and therefore `updateComplete`) only starts
      // once the element's connectedCallback fires, which requires being
      // attached to a real document — Vue Test Utils mounts to a detached
      // container by default.
      attachTo: document.body,
      props: {
        modelValue: 'hello',
        type: 'email',
        placeholder: 'Email',
        disabled: true,
        invalid: true
      }
    })
    const el = wrapper.element as unknown as CdmtInputElement

    // `type`/`disabled`/`invalid` reflect property -> attribute on their own
    // update cycle (Lit), separate from Vue's — wait for it before asserting
    // on the attribute.
    await el.updateComplete

    expect(el.value).toBe('hello')
    expect(el.getAttribute('type')).toBe('email')
    expect(el.shadowRoot?.querySelector('input')?.placeholder).toBe('Email')
    expect(el.hasAttribute('disabled')).toBe(true)
    expect(el.hasAttribute('invalid')).toBe(true)
  })

  it('defaults modelValue to an empty string and type to text', async () => {
    const wrapper = mount(CdmtInput, { attachTo: document.body })
    const el = wrapper.element as unknown as CdmtInputElement

    await el.updateComplete

    expect(el.value).toBe('')
    expect(el.getAttribute('type')).toBe('text')
  })

  it('emits update:modelValue with the typed value on input', () => {
    const wrapper = mount(CdmtInput, { props: { modelValue: '' } })
    const el = wrapper.element as unknown as CdmtInputElement

    // cdmt-input's own internal handler already updates its `value`
    // property before the (composed) input event bubbles out — simulating
    // that here by setting `value` directly on the host before dispatching,
    // which is exactly what the wrapper's handler reads from the event
    // target. cdmt-input's own internal behavior is covered by ui-kit-core.
    el.value = 'typed'
    el.dispatchEvent(new Event('input', { bubbles: true, composed: true }))

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['typed'])
  })
})
