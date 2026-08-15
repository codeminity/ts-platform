import { toCssCustomPropertyName } from './css-custom-property-name.js'
import { flattenThemeTokens } from './flatten-theme-tokens.js'

import type {
  ColorRole,
  ThemeColor,
  ThemeColors,
  ThemeMode,
  ThemePreset,
  ThemeTokens
} from './theme.type.js'

/**
 * Applies a {@link ThemePreset} to `target` by setting each resolved token
 * as a `--cdmt-*` CSS custom property. Custom properties inherit across
 * shadow DOM boundaries, so applying to `document.documentElement` re-themes
 * every component on the page with no per-component JS — including on
 * repeat calls, which is what makes runtime theme/mode switching work.
 *
 * @public
 */
export function applyTheme(
  target: HTMLElement,
  preset: ThemePreset,
  mode: ThemeMode = 'light'
): void {
  const flat = flattenThemeTokens(preset.tokens, mode)

  for (const [key, value] of Object.entries(flat)) {
    target.style.setProperty(toCssCustomPropertyName(key), value)
  }
}

/**
 * Per-field overrides layered onto a {@link ThemePreset} by {@link mergeTheme}
 * — mirrors {@link ThemeTokens}'s own shape: `colors` overrides are
 * per-role, per-mode, and partial at the individual {@link ColorRole} field
 * level.
 *
 * @public
 */
export interface ThemePresetOverrides {
  tokens?: Partial<Omit<ThemeTokens, 'colors' | 'custom' | 'focusRingColor'>>
  focusRingColor?: Partial<{ light: string; dark: string }>
  colors?: {
    [K in keyof ThemeColors]?: ThemeColors[K] extends ThemeColor
      ? { light?: Partial<ColorRole>; dark?: Partial<ColorRole> }
      : Partial<{ light: string; dark: string }>
  }
  custom?: Record<string, ThemeColor>
}

function mergeColorRole(base: ColorRole, override?: Partial<ColorRole>): ColorRole {
  return { ...base, ...override }
}

function mergeThemeColor(
  base: ThemeColor,
  override: { light?: Partial<ColorRole>; dark?: Partial<ColorRole> }
): ThemeColor {
  return {
    light: mergeColorRole(base.light, override.light),
    dark: mergeColorRole(base.dark, override.dark)
  }
}

/**
 * Layers `overrides` onto `base`, field by field, returning a new
 * {@link ThemePreset}. This is the supported way to customize a shipped
 * preset — always through a config object, never by hand-writing CSS
 * against `--cdmt-*` names.
 *
 * @public
 */
export function mergeTheme(base: ThemePreset, overrides: ThemePresetOverrides): ThemePreset {
  const baseColors = base.tokens.colors

  const mergedColors: ThemeColors = { ...baseColors }

  for (const [roleName, roleOverride] of Object.entries(overrides.colors ?? {})) {
    if (roleName === 'text') {
      mergedColors.text = {
        ...baseColors.text,
        ...(roleOverride as Partial<{ light: string; dark: string }>)
      }
      continue
    }

    const key = roleName as Exclude<keyof ThemeColors, 'text'>

    mergedColors[key] = mergeThemeColor(
      baseColors[key],
      roleOverride as { light?: Partial<ColorRole>; dark?: Partial<ColorRole> }
    )
  }

  // Spread in conditionally (rather than `custom: mergedCustom ?? undefined`) so the key
  // is omitted entirely when neither side has custom colors — `exactOptionalPropertyTypes`
  // treats an explicit `undefined` value as distinct from an absent key.
  const customEntry =
    base.tokens.custom || overrides.custom
      ? { custom: { ...base.tokens.custom, ...overrides.custom } }
      : {}

  return {
    tokens: {
      ...base.tokens,
      ...overrides.tokens,
      colors: mergedColors,
      focusRingColor: { ...base.tokens.focusRingColor, ...overrides.focusRingColor },
      ...customEntry
    }
  }
}
