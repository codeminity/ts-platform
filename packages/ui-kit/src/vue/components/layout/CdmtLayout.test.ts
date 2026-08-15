// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../index.js'

import { CdmtLayout } from './CdmtLayout.js'

import type { CdmtLayout as CdmtLayoutElement } from '../../../components/layout/layout.js'

describe('CdmtLayout (Vue)', () => {
  it('renders a cdmt-layout element', () => {
    const wrapper = mount(CdmtLayout, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtLayoutElement

    expect(element.tagName.toLowerCase()).toBe('cdmt-layout')
  })

  it('passes view and container through', async () => {
    const wrapper = mount(CdmtLayout, {
      props: { view: 'HHH lpr FFF', container: true },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtLayoutElement
    await element.updateComplete

    expect(element.view).toBe('HHH lpr FFF')
    expect(element.hasAttribute('container')).toBe(true)
  })

  it('renders slotted content', () => {
    const wrapper = mount(CdmtLayout, {
      slots: { default: '<div id="page">page</div>' },
      attachTo: document.body
    })

    expect(wrapper.html()).toContain('id="page"')
  })
})
