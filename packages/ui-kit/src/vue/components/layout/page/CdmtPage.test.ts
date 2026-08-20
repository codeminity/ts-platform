// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../../index.js'

import { CdmtPage } from './CdmtPage.js'

import type { CdmtPage as CdmtPageElement } from '../../../../components/layout/page/page.js'

describe('cdmtPage (Vue)', () => {
  it('passes a styleFn through', () => {
    const styleFn = (offset: number) => ({ minHeight: `${String(offset)}px` })
    const wrapper = mount(CdmtPage, { props: { styleFn }, attachTo: document.body })
    const element = wrapper.element as unknown as CdmtPageElement

    expect(element.styleFn).toBe(styleFn)
  })
})
