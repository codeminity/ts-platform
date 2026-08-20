// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import { applyTheme, mergeTheme } from './apply-theme.js'
import { material } from './presets/material.js'

describe(applyTheme, () => {
  it('paints every flattened token as a --cdmt-* custom property, defaulting to light', () => {
    const el = document.createElement('div')

    applyTheme(el, material)

    expect(el.style.getPropertyValue('--cdmt-color-primary')).toBe(
      material.tokens.colors.primary.light.value
    )
    expect(el.style.getPropertyValue('--cdmt-color-text')).toBe(material.tokens.colors.text.light)
    expect(el.style.getPropertyValue('--cdmt-radius-md')).toBe(material.tokens.radiusMd)
  })

  it('paints dark-mode values when mode is dark', () => {
    const el = document.createElement('div')

    applyTheme(el, material, 'dark')

    expect(el.style.getPropertyValue('--cdmt-color-primary')).toBe(
      material.tokens.colors.primary.dark.value
    )
    expect(el.style.getPropertyValue('--cdmt-color-text')).toBe(material.tokens.colors.text.dark)
  })

  it('re-applying overwrites previously-painted values', () => {
    const el = document.createElement('div')

    applyTheme(el, material, 'light')

    expect(el.style.getPropertyValue('--cdmt-color-primary')).toBe(
      material.tokens.colors.primary.light.value
    )

    applyTheme(el, material, 'dark')

    expect(el.style.getPropertyValue('--cdmt-color-primary')).toBe(
      material.tokens.colors.primary.dark.value
    )
  })
})

describe(mergeTheme, () => {
  it('overrides a single color-role field without touching its siblings', () => {
    const merged = mergeTheme(material, {
      colors: { primary: { light: { value: '#000000' } } }
    })

    expect(merged.tokens.colors.primary.light.value).toBe('#000000')
    expect(merged.tokens.colors.primary.light.onHover).toBe(
      material.tokens.colors.primary.light.onHover
    )
    expect(merged.tokens.colors.primary.light.foreground).toBe(
      material.tokens.colors.primary.light.foreground
    )
    expect(merged.tokens.colors.primary.dark).toStrictEqual(material.tokens.colors.primary.dark)
  })

  it('overrides the text exception (plain light/dark strings, not a ColorRole)', () => {
    const merged = mergeTheme(material, { colors: { text: { dark: '#ffffff' } } })

    expect(merged.tokens.colors.text.dark).toBe('#ffffff')
    expect(merged.tokens.colors.text.light).toBe(material.tokens.colors.text.light)
  })

  it('overrides a scalar token', () => {
    const merged = mergeTheme(material, { tokens: { radiusMd: '2px' } })

    expect(merged.tokens.radiusMd).toBe('2px')
    expect(merged.tokens.spacingSm).toBe(material.tokens.spacingSm)
  })

  it('overrides focusRingColor independently of tokens/colors', () => {
    const merged = mergeTheme(material, { focusRingColor: { light: '#e11d48' } })

    expect(merged.tokens.focusRingColor.light).toBe('#e11d48')
    expect(merged.tokens.focusRingColor.dark).toBe(material.tokens.focusRingColor.dark)
  })

  it('adds custom colors without touching built-in ones', () => {
    const merged = mergeTheme(material, {
      custom: {
        accent2: {
          light: { value: '#123456', onHover: '#654321', foreground: '#ffffff' },
          dark: { value: '#abcdef', onHover: '#fedcba', foreground: '#000000' }
        }
      }
    })

    expect(merged.tokens.custom?.accent2?.light.value).toBe('#123456')
    expect(merged.tokens.colors.primary).toStrictEqual(material.tokens.colors.primary)
  })

  it('returns an equivalent preset when given no overrides', () => {
    expect(mergeTheme(material, {})).toStrictEqual(material)
  })
})
