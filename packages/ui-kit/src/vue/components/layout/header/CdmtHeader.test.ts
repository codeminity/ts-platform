// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../../index.js'

import { CdmtHeader } from './CdmtHeader.js'

import type { CdmtHeader as CdmtHeaderElement } from '../../../../components/layout/header/header.js'

describe('cdmtHeader (Vue)', () => {
  it('renders a cdmt-header element', () => {
    const wrapper = mount(CdmtHeader, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtHeaderElement

    expect(element.tagName.toLowerCase()).toBe('cdmt-header')
  })

  it('passes modelValue/reveal/revealOffset/bordered/elevated/heightHint through', async () => {
    const wrapper = mount(CdmtHeader, {
      props: {
        modelValue: false,
        reveal: true,
        revealOffset: 100,
        bordered: true,
        elevated: true,
        heightHint: 64
      },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtHeaderElement
    await element.updateComplete

    expect(element.hasAttribute('hidden')).toBe(true)
    expect(element.reveal).toBe(true)
    expect(element.revealOffset).toBe(100)
    expect(element.hasAttribute('bordered')).toBe(true)
    expect(element.hasAttribute('elevated')).toBe(true)
    expect(element.heightHint).toBe(64)
  })

  it('emits reveal with the real detail payload from a native cdmt-reveal event', async () => {
    const wrapper = mount(CdmtHeader, {
      props: { reveal: true },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtHeaderElement
    await element.updateComplete

    element.dispatchEvent(new CustomEvent('cdmt-reveal', { detail: false }))

    expect(wrapper.emitted('reveal')?.[0]).toStrictEqual([false])
  })

  it('renders slotted content', () => {
    const wrapper = mount(CdmtHeader, {
      slots: { default: '<span>title</span>' },
      attachTo: document.body
    })

    expect(wrapper.html()).toContain('<span>title</span>')
  })
})
