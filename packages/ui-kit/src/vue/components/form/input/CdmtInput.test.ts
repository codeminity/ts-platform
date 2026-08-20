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
