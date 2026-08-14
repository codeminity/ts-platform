import { toCssCustomPropertyName } from './css-custom-property-name.js'

import type { ThemeMode, ThemeModeTokens, ThemePreset, ThemeTokens } from './theme.type.js'

/**
 * Applies a {@link ThemePreset} to `target` by setting each token as a
 * `--cdmt-*` CSS custom property. Custom properties inherit across shadow
 * DOM boundaries, so applying to `document.documentElement` re-themes every
 * component on the page with no per-component JS — including on repeat
 * calls, which is what makes runtime theme/mode switching work.
 *
 * @public
 */
export function applyTheme(
  target: HTMLElement,
  preset: ThemePreset,
  mode: ThemeMode = 'light'
): void {
  const resolved: Record<string, string> = { ...preset.tokens, ...preset[mode] }

  for (const [key, value] of Object.entries(resolved)) {
    target.style.setProperty(toCssCustomPropertyName(key), value)
  }
}

/**
 * Per-field overrides layered onto a {@link ThemePreset} by {@link mergeTheme}
 * — e.g. an app taking the `material` preset but tightening its `radiusMd`.
 *
 * @public
 */
export interface ThemePresetOverrides {
  tokens?: Partial<ThemeTokens>
  light?: Partial<ThemeModeTokens>
  dark?: Partial<ThemeModeTokens>
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
  return {
    tokens: { ...base.tokens, ...overrides.tokens },
    light: { ...base.light, ...overrides.light },
    dark: { ...base.dark, ...overrides.dark }
  }
}
