import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { mergeTheme } from './apply-theme.js'

import type { ThemeModeTokens, ThemePreset, ThemeTokens } from './theme.type.js'

const tokenValue = fc
  .string({ unit: 'grapheme-ascii', minLength: 1, maxLength: 20 })
  .filter((value) => /^[\w#%.\- ]+$/.test(value) && value.trim() === value)

const themeTokenKeys = [
  'colorPrimary',
  'colorPrimaryHover',
  'colorOnPrimary',
  'colorSecondary',
  'colorSecondaryHover',
  'colorOnSecondary',
  'colorGhostHover',
  'colorDanger',
  'fontFamily',
  'fontSize',
  'radiusMd',
  'transitionDuration',
  'transitionEasing'
] as const

const themeModeTokenKeys = ['colorBg', 'colorSurface', 'colorBorder', 'colorText'] as const

const fullThemeTokens: fc.Arbitrary<ThemeTokens> = fc.record(
  Object.fromEntries(themeTokenKeys.map((key) => [key, tokenValue])) as Record<
    (typeof themeTokenKeys)[number],
    typeof tokenValue
  >
)

const fullThemeModeTokens: fc.Arbitrary<ThemeModeTokens> = fc.record(
  Object.fromEntries(themeModeTokenKeys.map((key) => [key, tokenValue])) as Record<
    (typeof themeModeTokenKeys)[number],
    typeof tokenValue
  >
)

const partialThemeTokens = fc.record(
  Object.fromEntries(themeTokenKeys.map((key) => [key, tokenValue])) as Record<
    (typeof themeTokenKeys)[number],
    typeof tokenValue
  >,
  { requiredKeys: [] }
)

const partialThemeModeTokens = fc.record(
  Object.fromEntries(themeModeTokenKeys.map((key) => [key, tokenValue])) as Record<
    (typeof themeModeTokenKeys)[number],
    typeof tokenValue
  >,
  { requiredKeys: [] }
)

const themePresetArbitrary: fc.Arbitrary<ThemePreset> = fc.record({
  tokens: fullThemeTokens,
  light: fullThemeModeTokens,
  dark: fullThemeModeTokens
})

const overridesArbitrary = fc.record(
  {
    tokens: partialThemeTokens,
    light: partialThemeModeTokens,
    dark: partialThemeModeTokens
  },
  { requiredKeys: [] }
)

describe('mergeTheme (property-based)', () => {
  it('every field is either the override value (if given) or the base value (if not) — never anything else', () => {
    fc.assert(
      fc.property(themePresetArbitrary, overridesArbitrary, (base, overrides) => {
        const merged = mergeTheme(base, overrides)

        for (const key of themeTokenKeys) {
          const expected = overrides.tokens?.[key] ?? base.tokens[key]
          expect(merged.tokens[key]).toBe(expected)
        }

        for (const key of themeModeTokenKeys) {
          expect(merged.light[key]).toBe(overrides.light?.[key] ?? base.light[key])
          expect(merged.dark[key]).toBe(overrides.dark?.[key] ?? base.dark[key])
        }
      })
    )
  })
})
