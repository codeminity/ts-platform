// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'

import { applyTheme, mergeTheme } from './apply-theme.js'
import { material } from './presets/material.js'

describe('applyTheme', () => {
  it('sets every brand token as a --cdmt-* custom property on the target', () => {
    const target = document.createElement('div')

    applyTheme(target, material, 'light')

    expect(target.style.getPropertyValue('--cdmt-color-primary')).toBe(material.tokens.colorPrimary)
    expect(target.style.getPropertyValue('--cdmt-radius-md')).toBe(material.tokens.radiusMd)
  })

  it('sets the mode tokens for the given color scheme', () => {
    const target = document.createElement('div')

    applyTheme(target, material, 'dark')

    expect(target.style.getPropertyValue('--cdmt-color-bg')).toBe(material.dark.colorBg)
  })

  it('defaults to light mode when no mode is given', () => {
    const target = document.createElement('div')

    applyTheme(target, material)

    expect(target.style.getPropertyValue('--cdmt-color-bg')).toBe(material.light.colorBg)
  })

  it('keeps brand tokens identical between light and dark — only mode tokens change', () => {
    const lightTarget = document.createElement('div')
    const darkTarget = document.createElement('div')

    applyTheme(lightTarget, material, 'light')
    applyTheme(darkTarget, material, 'dark')

    expect(lightTarget.style.getPropertyValue('--cdmt-color-primary')).toBe(
      darkTarget.style.getPropertyValue('--cdmt-color-primary')
    )
    expect(lightTarget.style.getPropertyValue('--cdmt-color-bg')).not.toBe(
      darkTarget.style.getPropertyValue('--cdmt-color-bg')
    )
  })

  it('re-applying with a different mode overwrites the previous mode tokens', () => {
    const target = document.createElement('div')

    applyTheme(target, material, 'light')
    applyTheme(target, material, 'dark')

    expect(target.style.getPropertyValue('--cdmt-color-bg')).toBe(material.dark.colorBg)
  })
})

describe('mergeTheme', () => {
  it('overrides only the given brand token, leaving the rest of the preset untouched', () => {
    const merged = mergeTheme(material, { tokens: { radiusMd: '2px' } })

    expect(merged.tokens.radiusMd).toBe('2px')
    expect(merged.tokens.colorPrimary).toBe(material.tokens.colorPrimary)
    expect(merged.light).toEqual(material.light)
    expect(merged.dark).toEqual(material.dark)
  })

  it('overrides only the given mode token, leaving tokens and the other mode untouched', () => {
    const merged = mergeTheme(material, { dark: { colorBg: '#000000' } })

    expect(merged.dark.colorBg).toBe('#000000')
    expect(merged.dark.colorSurface).toBe(material.dark.colorSurface)
    expect(merged.light).toEqual(material.light)
    expect(merged.tokens).toEqual(material.tokens)
  })

  it('returns the base preset unchanged when no overrides are given', () => {
    expect(mergeTheme(material, {})).toEqual(material)
  })
})
