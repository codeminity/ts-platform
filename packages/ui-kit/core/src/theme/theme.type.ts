/**
 * Tokens set once by whoever configures a theme (an app, or a theme preset
 * author) and left untouched when the color scheme switches between light
 * and dark — brand identity shouldn't shift just because the user flipped a
 * system setting.
 *
 * @public
 */
export interface ThemeTokens {
  colorPrimary: string
  colorPrimaryHover: string
  colorOnPrimary: string
  colorSecondary: string
  colorSecondaryHover: string
  colorOnSecondary: string
  colorGhostHover: string
  fontFamily: string
  fontSize: string
  radiusMd: string
  transitionDuration: string
  transitionEasing: string
}

/**
 * Tokens that DO change between light and dark — page/surface backgrounds,
 * borders, and default text color. Every {@link ThemePreset} carries one set
 * of these per color scheme.
 *
 * @public
 */
export interface ThemeModeTokens {
  colorBg: string
  colorSurface: string
  colorBorder: string
  colorText: string
}

/**
 * A complete, named theme — e.g. `material`, `fancy`, `energetic`. The
 * {@link ThemeTokens} half stays fixed across light/dark; `light`/`dark`
 * each supply the {@link ThemeModeTokens} half for that color scheme.
 *
 * @public
 */
export interface ThemePreset {
  tokens: ThemeTokens
  light: ThemeModeTokens
  dark: ThemeModeTokens
}

/**
 * Which {@link ThemeModeTokens} half of a {@link ThemePreset} to apply.
 *
 * @public
 */
export type ThemeMode = 'light' | 'dark'
