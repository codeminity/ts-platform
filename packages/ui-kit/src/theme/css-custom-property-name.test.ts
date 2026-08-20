import { describe, expect, it } from 'vitest'

import { toCssCustomPropertyName } from './css-custom-property-name.js'

describe(toCssCustomPropertyName, () => {
  it('converts a camelCase key with multiple humps', () => {
    expect(toCssCustomPropertyName('colorPrimaryHoverForeground')).toBe(
      '--cdmt-color-primary-hover-foreground'
    )
  })
})
