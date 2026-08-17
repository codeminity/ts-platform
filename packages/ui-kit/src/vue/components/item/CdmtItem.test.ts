// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../index.js'

import { CdmtItem } from './CdmtItem.js'

import type { CdmtItem as CdmtItemElement } from '../../../components/item/item.js'

describe('CdmtItem (Vue)', () => {
  it('renders a cdmt-item element', () => {
    const wrapper = mount(CdmtItem, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtItemElement

    expect(element.tagName.toLowerCase()).toBe('cdmt-item')
  })

  it('passes disable/active/clickable/dense/insetLevel/manualFocus/focused through', async () => {
    const wrapper = mount(CdmtItem, {
      props: {
        disable: true,
        active: true,
        clickable: true,
        dense: true,
        insetLevel: 2,
        manualFocus: true,
        focused: true
      },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtItemElement
    await element.updateComplete

    expect(element.hasAttribute('disable')).toBe(true)
    expect(element.hasAttribute('active')).toBe(true)
    expect(element.hasAttribute('clickable')).toBe(true)
    expect(element.hasAttribute('dense')).toBe(true)
    expect(element.insetLevel).toBe(2)
    expect(element.manualFocus).toBe(true)
    expect(element.hasAttribute('focused')).toBe(true)
  })

  it('renders slotted content', () => {
    const wrapper = mount(CdmtItem, {
      slots: { default: '<span>row</span>' },
      attachTo: document.body
    })

    expect(wrapper.html()).toContain('<span>row</span>')
  })

  it('forwards a native @click with no wrapper-side translation', async () => {
    const wrapper = mount(CdmtItem, { attachTo: document.body })
    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
