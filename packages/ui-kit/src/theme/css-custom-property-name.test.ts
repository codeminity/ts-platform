import { describe, expect, it } from 'vitest'

import { toCssCustomPropertyName } from './css-custom-property-name.js'

describe(toCssCustomPropertyName, () => {
  it('converts a single-word key', () => {
    expect(toCssCustomPropertyName('primary')).toBe('--cdmt-primary')
  })

  it('converts a camelCase key with one hump', () => {
    expect(toCssCustomPropertyName('colorPrimary')).toBe('--cdmt-color-primary')
  })

  it('converts a camelCase key with multiple humps', () => {
    expect(toCssCustomPropertyName('colorPrimaryHoverForeground')).toBe(
      '--cdmt-color-primary-hover-foreground'
    )
  })

  it('handles an already-lowercase key with no humps', () => {
    expect(toCssCustomPropertyName('radiusmd')).toBe('--cdmt-radiusmd')
  })
})
