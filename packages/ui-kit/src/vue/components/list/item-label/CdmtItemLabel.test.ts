// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import '../../../../index.js'

import { CdmtItemLabel } from './CdmtItemLabel.js'

import type { CdmtItemLabel as CdmtItemLabelElement } from '../../../../components/list/item-label/item-label.js'

describe('cdmtItemLabel (Vue)', () => {
  it('passes overline/caption/header/lines through', async () => {
    const wrapper = mount(CdmtItemLabel, {
      props: { overline: true, caption: true, header: true, lines: 2 },
      attachTo: document.body
    })
    const element = wrapper.element as unknown as CdmtItemLabelElement
    await element.updateComplete

    expect(element.hasAttribute('overline')).toBe(true)
    expect(element.hasAttribute('caption')).toBe(true)
    expect(element.hasAttribute('header')).toBe(true)
    expect(element.lines).toBe(2)
  })
})
