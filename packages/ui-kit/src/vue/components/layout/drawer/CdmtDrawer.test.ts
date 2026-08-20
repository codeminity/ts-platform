// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../../index.js'

import { CdmtDrawer } from './CdmtDrawer.js'

import type { CdmtDrawer as CdmtDrawerElement } from '../../../../components/layout/drawer/drawer.js'

describe('cdmtDrawer (Vue)', () => {
  it('emits update:modelValue with the real value from a native cdmt-model-value-change event', async () => {
    const wrapper = mount(CdmtDrawer, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtDrawerElement
    await element.updateComplete

    element.dispatchEvent(new CustomEvent('cdmt-model-value-change', { detail: true }))

    expect(wrapper.emitted('update:modelValue')?.[0]).toStrictEqual([true])
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
    const vm = wrapper.vm as unknown as { show: () => void; hide: () => void; toggle: () => void }
    await element.updateComplete

    vm.show()
    await element.updateComplete

    expect(element.modelValue).toBe(true)

    vm.hide()
    await element.updateComplete

    expect(element.modelValue).toBe(false)

    vm.toggle()
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
