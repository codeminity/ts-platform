// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../../index.js'

import { CdmtPageContainer } from './CdmtPageContainer.js'

import type { CdmtPageContainer as CdmtPageContainerElement } from '../../../../components/layout/page-container/page-container.js'

describe('cdmtPageContainer (Vue)', () => {
  it('renders a cdmt-page-container element', () => {
    const wrapper = mount(CdmtPageContainer, { attachTo: document.body })
    const element = wrapper.element as unknown as CdmtPageContainerElement

    expect(element.tagName.toLowerCase()).toBe('cdmt-page-container')
  })
})
