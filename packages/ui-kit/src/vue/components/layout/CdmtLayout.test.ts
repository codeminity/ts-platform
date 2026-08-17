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

  it('passes every fixed-*/over-*-drawer flag and container through', async () => {
    const wrapper = mount(CdmtLayout, {
      props: {
        fixedHeader: true,
        fixedFooter: true,
        fixedLeftDrawer: true,
        fixedRightDrawer: true,
        headerOverLeftDrawer: false,
        headerOverRightDrawer: false,
        footerOverLeftDrawer: false,
        footerOverRightDrawer: false,
        container: true,
        transitionDuration: '300ms'
      },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtLayoutElement
    await element.updateComplete

    expect(element.hasAttribute('fixed-header')).toBe(true)
    expect(element.hasAttribute('fixed-footer')).toBe(true)
    expect(element.hasAttribute('fixed-left-drawer')).toBe(true)
    expect(element.hasAttribute('fixed-right-drawer')).toBe(true)
    expect(element.hasAttribute('header-over-left-drawer')).toBe(false)
    expect(element.hasAttribute('header-over-right-drawer')).toBe(false)
    expect(element.hasAttribute('footer-over-left-drawer')).toBe(false)
    expect(element.hasAttribute('footer-over-right-drawer')).toBe(false)
    expect(element.hasAttribute('container')).toBe(true)
    expect(element.getAttribute('transition-duration')).toBe('300ms')
  })

  it('defaults every fixed-* flag to false, every over-*-drawer flag to true, and transitionDuration to undefined', async () => {
    const wrapper = mount(CdmtLayout, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtLayoutElement
    await element.updateComplete

    expect(element.fixedHeader).toBe(false)
    expect(element.fixedFooter).toBe(false)
    expect(element.fixedLeftDrawer).toBe(false)
    expect(element.fixedRightDrawer).toBe(false)
    expect(element.headerOverLeftDrawer).toBe(true)
    expect(element.headerOverRightDrawer).toBe(true)
    expect(element.footerOverLeftDrawer).toBe(true)
    expect(element.footerOverRightDrawer).toBe(true)
    expect(element.transitionDuration).toBeUndefined()
  })

  it('renders slotted content', () => {
    const wrapper = mount(CdmtLayout, {
      slots: { default: '<div id="page">page</div>' },
      attachTo: document.body
    })

    expect(wrapper.html()).toContain('id="page"')
  })
})
