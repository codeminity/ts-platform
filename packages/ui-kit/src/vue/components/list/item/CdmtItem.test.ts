// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../../index.js'

import { CdmtItem } from './CdmtItem.js'

describe('cdmtItem (Vue)', () => {
  it('forwards a native @click with no wrapper-side translation', async () => {
    const wrapper = mount(CdmtItem, { attachTo: document.body })
    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
