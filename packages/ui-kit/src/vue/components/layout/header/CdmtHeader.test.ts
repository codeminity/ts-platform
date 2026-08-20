// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../../index.js'

import { CdmtHeader } from './CdmtHeader.js'

import type { CdmtHeader as CdmtHeaderElement } from '../../../../components/layout/header/header.js'

describe('cdmtHeader (Vue)', () => {
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
})
