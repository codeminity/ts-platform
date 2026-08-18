// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../../index.js'

import { CdmtPage } from './CdmtPage.js'

import type { CdmtPage as CdmtPageElement } from '../../../../components/layout/page/page.js'

describe('CdmtPage (Vue)', () => {
  it('renders a cdmt-page element', () => {
    const wrapper = mount(CdmtPage, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtPageElement

    expect(element.tagName.toLowerCase()).toBe('cdmt-page')
  })

  it('passes padding through as a property', async () => {
    const wrapper = mount(CdmtPage, { props: { padding: true }, attachTo: document.body })
    const element = wrapper.element as unknown as CdmtPageElement
    await element.updateComplete

    expect(element.hasAttribute('padding')).toBe(true)
  })

  it('passes a styleFn through', () => {
    const styleFn = (offset: number) => ({ minHeight: `${String(offset)}px` })
    const wrapper = mount(CdmtPage, { props: { styleFn }, attachTo: document.body })
    const element = wrapper.element as unknown as CdmtPageElement

    expect(element.styleFn).toBe(styleFn)
  })

  it('renders slotted content', () => {
    const wrapper = mount(CdmtPage, {
      slots: { default: '<p>content</p>' },
      attachTo: document.body
    })

    expect(wrapper.html()).toContain('<p>content</p>')
  })
})
