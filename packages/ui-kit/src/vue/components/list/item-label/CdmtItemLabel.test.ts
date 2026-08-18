// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../../index.js'

import { CdmtItemLabel } from './CdmtItemLabel.js'

import type { CdmtItemLabel as CdmtItemLabelElement } from '../../../../components/list/item-label/item-label.js'

describe('CdmtItemLabel (Vue)', () => {
  it('renders a cdmt-item-label element', () => {
    const wrapper = mount(CdmtItemLabel, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtItemLabelElement

    expect(element.tagName.toLowerCase()).toBe('cdmt-item-label')
  })

  it('passes overline/caption/header/lines through', async () => {
    const wrapper = mount(CdmtItemLabel, {
      props: { overline: true, caption: true, header: true, lines: 2 },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtItemLabelElement
    await element.updateComplete

    expect(element.hasAttribute('overline')).toBe(true)
    expect(element.hasAttribute('caption')).toBe(true)
    expect(element.hasAttribute('header')).toBe(true)
    expect(element.lines).toBe(2)
  })

  it('renders slotted content', () => {
    const wrapper = mount(CdmtItemLabel, {
      slots: { default: 'Title' },
      attachTo: document.body
    })

    expect(wrapper.text()).toBe('Title')
  })
})
