// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../index.js'

import { CdmtFooter } from './CdmtFooter.js'

import type { CdmtFooter as CdmtFooterElement } from '../../../components/footer/footer.js'

describe('CdmtFooter (Vue)', () => {
  it('renders a cdmt-footer element', () => {
    const wrapper = mount(CdmtFooter, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtFooterElement

    expect(element.tagName.toLowerCase()).toBe('cdmt-footer')
  })

  it('passes modelValue/reveal/bordered/elevated/heightHint through', async () => {
    const wrapper = mount(CdmtFooter, {
      props: { modelValue: false, reveal: true, bordered: true, elevated: true, heightHint: 64 },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtFooterElement
    await element.updateComplete

    expect(element.hasAttribute('hidden')).toBe(true)
    expect(element.reveal).toBe(true)
    expect(element.hasAttribute('bordered')).toBe(true)
    expect(element.hasAttribute('elevated')).toBe(true)
    expect(element.heightHint).toBe(64)
  })

  it('emits reveal with the real detail payload from a native cdmt-reveal event', async () => {
    const wrapper = mount(CdmtFooter, {
      props: { reveal: true },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtFooterElement
    await element.updateComplete

    element.dispatchEvent(new CustomEvent('cdmt-reveal', { detail: true }))

    expect(wrapper.emitted('reveal')?.[0]).toEqual([true])
  })

  it('renders slotted content', () => {
    const wrapper = mount(CdmtFooter, {
      slots: { default: '<span>footer</span>' },
      attachTo: document.body
    })

    expect(wrapper.html()).toContain('<span>footer</span>')
  })
})
