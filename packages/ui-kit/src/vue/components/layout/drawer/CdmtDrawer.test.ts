// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../../index.js'

import { CdmtDrawer } from './CdmtDrawer.js'

import type { CdmtDrawer as CdmtDrawerElement } from '../../../../components/layout/drawer/drawer.js'

describe('CdmtDrawer (Vue)', () => {
  it('renders a cdmt-drawer element', () => {
    const wrapper = mount(CdmtDrawer, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtDrawerElement

    expect(element.tagName.toLowerCase()).toBe('cdmt-drawer')
  })

  it('passes every prop through to the underlying element', async () => {
    const wrapper = mount(CdmtDrawer, {
      props: {
        modelValue: true,
        side: 'right',
        overlay: true,
        width: 320,
        mini: true,
        miniWidth: 64,
        miniToOverlay: true,
        noMiniAnimation: true,
        breakpoint: 800,
        behavior: 'mobile',
        bordered: true,
        elevated: true,
        persistent: true,
        showIfAbove: true
      },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtDrawerElement
    await element.updateComplete

    expect(element.modelValue).toBe(true)
    expect(element.side).toBe('right')
    expect(element.overlay).toBe(true)
    expect(element.width).toBe(320)
    expect(element.mini).toBe(true)
    expect(element.miniWidth).toBe(64)
    expect(element.miniToOverlay).toBe(true)
    expect(element.noMiniAnimation).toBe(true)
    expect(element.breakpoint).toBe(800)
    expect(element.behavior).toBe('mobile')
    expect(element.bordered).toBe(true)
    expect(element.elevated).toBe(true)
    expect(element.persistent).toBe(true)
    expect(element.showIfAbove).toBe(true)
  })

  it('emits update:modelValue with the real value from a native cdmt-model-value-change event', async () => {
    const wrapper = mount(CdmtDrawer, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtDrawerElement
    await element.updateComplete

    element.dispatchEvent(new CustomEvent('cdmt-model-value-change', { detail: true }))

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  it('emits before-show/show/before-hide/hide from their native cdmt-* events', async () => {
    const wrapper = mount(CdmtDrawer, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtDrawerElement
    await element.updateComplete

    element.dispatchEvent(new CustomEvent('cdmt-before-show'))
    element.dispatchEvent(new CustomEvent('cdmt-show'))
    element.dispatchEvent(new CustomEvent('cdmt-before-hide'))
    element.dispatchEvent(new CustomEvent('cdmt-hide'))

    expect(wrapper.emitted('before-show')).toHaveLength(1)
    expect(wrapper.emitted('show')).toHaveLength(1)
    expect(wrapper.emitted('before-hide')).toHaveLength(1)
    expect(wrapper.emitted('hide')).toHaveLength(1)
  })

  it('exposes show/hide/toggle, delegating to the real underlying element', async () => {
    const wrapper = mount(CdmtDrawer, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtDrawerElement
    await element.updateComplete

    ;(wrapper.vm as unknown as { show: () => void }).show()
    await element.updateComplete
    expect(element.modelValue).toBe(true)

    ;(wrapper.vm as unknown as { hide: () => void }).hide()
    await element.updateComplete
    expect(element.modelValue).toBe(false)

    ;(wrapper.vm as unknown as { toggle: () => void }).toggle()
    await element.updateComplete
    expect(element.modelValue).toBe(true)
  })

  it('exposed show/hide/toggle do not throw once the underlying element ref is gone (after unmount)', () => {
    const wrapper = mount(CdmtDrawer, { attachTo: document.body })
    const vm = wrapper.vm as unknown as { show: () => void; hide: () => void; toggle: () => void }

    wrapper.unmount()

    expect(() => {
      vm.show()
    }).not.toThrow()
    expect(() => {
      vm.hide()
    }).not.toThrow()
    expect(() => {
      vm.toggle()
    }).not.toThrow()
  })

  it('renders default slot content', () => {
    const wrapper = mount(CdmtDrawer, {
      slots: { default: '<p>full</p>' },
      attachTo: document.body
    })

    expect(wrapper.html()).toContain('<p>full</p>')
  })

  it('routes mini slot content to the mini named slot', () => {
    const wrapper = mount(CdmtDrawer, {
      slots: { mini: '<span>icon</span>' },
      attachTo: document.body
    })

    const element = wrapper.element as unknown as CdmtDrawerElement
    const miniContent = element.querySelector('span[slot="mini"]')
    expect(miniContent?.textContent).toBe('icon')
  })
})
