// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../../index.js'

import { CdmtFooter } from './CdmtFooter.js'

import type { CdmtFooter as CdmtFooterElement } from '../../../../components/layout/footer/footer.js'

describe('cdmtFooter (Vue)', () => {
  it('emits reveal with the real detail payload from a native cdmt-reveal event', async () => {
    const wrapper = mount(CdmtFooter, {
      props: { reveal: true },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtFooterElement
    await element.updateComplete

    element.dispatchEvent(new CustomEvent('cdmt-reveal', { detail: true }))

    expect(wrapper.emitted('reveal')?.[0]).toStrictEqual([true])
  })
})
