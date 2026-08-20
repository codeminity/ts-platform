// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../index.js'

import { CdmtLayout } from './CdmtLayout.js'

import type { CdmtLayout as CdmtLayoutElement } from '../../../components/layout/layout.js'

describe('cdmtLayout (Vue)', () => {
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
})
