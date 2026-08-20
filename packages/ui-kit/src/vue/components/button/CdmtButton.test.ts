// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../index.js'

import { CdmtButton } from './CdmtButton.js'

import type { CdmtButton as CdmtButtonElement } from '../../../components/button/button.js'

describe('cdmtButton (Vue)', () => {
  it('passes the disabled prop through', async () => {
    const wrapper = mount(CdmtButton, { props: { disabled: true }, attachTo: document.body })
    const element = wrapper.element as unknown as CdmtButtonElement
    await element.updateComplete

    expect(element.hasAttribute('disabled')).toBe(true)
  })
})
