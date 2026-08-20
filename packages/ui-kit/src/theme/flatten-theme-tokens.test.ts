import { describe, expect, it } from 'vitest'

import { flattenThemeTokens } from './flatten-theme-tokens.js'
import { material } from './presets/material.js'

describe(flattenThemeTokens, () => {
  it('flattens a color role resolved for dark', () => {
    const flat = flattenThemeTokens(material.tokens, 'dark')

    expect(flat.colorPrimary).toBe(material.tokens.colors.primary.dark.value)
  })

  it('flattens `text` to a single colorText key, not a value/hover/foreground triple', () => {
    const flat = flattenThemeTokens(material.tokens, 'light')

    expect(flat.colorText).toBe(material.tokens.colors.text.light)
    expect(flat.colorTextHover).toBeUndefined()
    expect(flat.colorTextForeground).toBeUndefined()
  })

  it('passes scalar tokens through under their own key', () => {
    const flat = flattenThemeTokens(material.tokens, 'light')

    expect(flat.radiusMd).toBe(material.tokens.radiusMd)
    expect(flat.spacingSm).toBe(material.tokens.spacingSm)
    expect(flat.fontFamily).toBe(material.tokens.fontFamily)
  })

  it('flattens custom colors the same way as built-in roles', () => {
    const withCustom = {
      ...material.tokens,
      custom: {
        accent2: {
          light: { value: '#123456', onHover: '#654321', foreground: '#ffffff' },
          dark: { value: '#abcdef', onHover: '#fedcba', foreground: '#000000' }
        }
      }
    }

    const flat = flattenThemeTokens(withCustom, 'light')

    expect(flat.colorAccent2).toBe('#123456')
    expect(flat.colorAccent2Hover).toBe('#654321')
    expect(flat.colorAccent2Foreground).toBe('#ffffff')
  })
})
