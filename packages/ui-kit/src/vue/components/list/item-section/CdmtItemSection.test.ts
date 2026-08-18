// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../../index.js'

import { CdmtItemSection } from './CdmtItemSection.js'

import type { CdmtItemSection as CdmtItemSectionElement } from '../../../../components/list/item-section/item-section.js'

describe('CdmtItemSection (Vue)', () => {
  it('renders a cdmt-item-section element', () => {
    const wrapper = mount(CdmtItemSection, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtItemSectionElement

    expect(element.tagName.toLowerCase()).toBe('cdmt-item-section')
  })

  it('passes avatar/thumbnail/side/top/noWrap through', async () => {
    const wrapper = mount(CdmtItemSection, {
      props: { avatar: true, thumbnail: true, side: true, top: true, noWrap: true },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtItemSectionElement
    await element.updateComplete

    expect(element.hasAttribute('avatar')).toBe(true)
    expect(element.hasAttribute('thumbnail')).toBe(true)
    expect(element.hasAttribute('side')).toBe(true)
    expect(element.hasAttribute('top')).toBe(true)
    expect(element.hasAttribute('no-wrap')).toBe(true)
  })

  it('renders slotted content', () => {
    const wrapper = mount(CdmtItemSection, {
      slots: { default: '<span>label</span>' },
      attachTo: document.body
    })

    expect(wrapper.html()).toContain('<span>label</span>')
  })
})
