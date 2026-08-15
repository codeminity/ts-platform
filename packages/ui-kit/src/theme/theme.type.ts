/**
 * One color, fully specified for a single color scheme: its own value, the
 * value it switches to on hover, and the contrast color for content
 * (text/icons) rendered on top of it.
 *
 * @public
 */
export interface ColorRole {
  value: string
  onHover: string
  foreground: string
}

/**
 * A {@link ColorRole} for both color schemes. Every named color in
 * {@link ThemeColors} carries its own light/dark pair — nothing is
 * structurally "fixed across modes" the way brand colors used to be; a theme
 * author who wants a color to stay the same in both modes just gives `light`
 * and `dark` the same values.
 *
 * @public
 */
export interface ThemeColor {
  light: ColorRole
  dark: ColorRole
}

/**
 * Every named color role a {@link ThemePreset} defines. `text` is the one
 * deliberate exception to the {@link ThemeColor} shape — it isn't a
 * background color anything else is colored with, just the default body
 * text color, so it's a plain per-mode string pair.
 *
 * @public
 */
export interface ThemeColors {
  primary: ThemeColor
  secondary: ThemeColor
  accent: ThemeColor
  background: ThemeColor
  surface: ThemeColor
  border: ThemeColor
  positive: ThemeColor
  negative: ThemeColor
  info: ThemeColor
  warning: ThemeColor
  text: { light: string; dark: string }
}

/**
 * A complete, named theme's full token set — colors plus every other
 * themeable scalar (typography, spacing, radius, shadow, borders, focus
 * ring, transitions). Every value is a plain string; setting one to `'0'` or
 * `'none'` is a valid way to turn that visual effect off entirely.
 *
 * @public
 */
export interface ThemeTokens {
  colors: ThemeColors
  /**
   * Arbitrary extra named colors beyond the built-in roles above — e.g. a
   * brand's own `accent2` or a `grey1` neutral. No registration step: any
   * key here becomes a `--cdmt-<key>-*` custom property the same way a
   * built-in role does.
   */
  custom?: Record<string, ThemeColor>

  fontFamily: string
  fontSize: string
  fontWeightNormal: string
  fontWeightBold: string
  lineHeight: string

  radiusXs: string
  radiusSm: string
  radiusMd: string
  radiusLg: string
  radiusFull: string

  spacingXs: string
  spacingSm: string
  spacingMd: string
  spacingLg: string
  spacingXl: string

  shadowXs: string
  shadowSm: string
  shadowMd: string
  shadowLg: string
  shadowXl: string

  borderWidth: string
  opacityDisabled: string

  focusRingColor: { light: string; dark: string }
  focusRingWidth: string

  transitionDuration: string
  transitionEasing: string
}

/**
 * A complete, named theme — e.g. `material`. Colors carry their own
 * light/dark pair per role (see {@link ThemeColor}); non-color tokens
 * (typography, spacing, radius, ...) are mode-independent scalars.
 *
 * @public
 */
export interface ThemePreset {
  tokens: ThemeTokens
}

/**
 * Which color scheme to resolve a {@link ThemePreset}'s colors against.
 *
 * @public
 */
export type ThemeMode = 'light' | 'dark'
