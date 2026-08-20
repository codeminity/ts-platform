// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../index.js'

import { CdmtList } from './CdmtList.js'

import type { CdmtList as CdmtListElement } from '../../../components/list/list.js'

describe('cdmtList (Vue)', () => {
  it('passes bordered/dense/separator/padding through', async () => {
    const wrapper = mount(CdmtList, {
      props: { bordered: true, dense: true, separator: true, padding: true },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtListElement
    await element.updateComplete

    expect(element.hasAttribute('bordered')).toBe(true)
    expect(element.hasAttribute('dense')).toBe(true)
    expect(element.hasAttribute('separator')).toBe(true)
    expect(element.hasAttribute('padding')).toBe(true)
  })
})
