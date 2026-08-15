import { unsafeCSS, type CSSResult } from 'lit'

import { toCssCustomPropertyName } from './css-custom-property-name.js'
import { flattenThemeTokens } from './flatten-theme-tokens.js'
import { material } from './presets/material.js'

type ColorRoleName =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'background'
  | 'surface'
  | 'border'
  | 'positive'
  | 'negative'
  | 'info'
  | 'warning'

type ColorVarKey =
  | `color${Capitalize<ColorRoleName>}`
  | `color${Capitalize<ColorRoleName>}Hover`
  | `color${Capitalize<ColorRoleName>}Foreground`

/**
 * Every flat key `themeVar()` accepts — the built-in color roles' `value`/
 * `onHover`/`foreground` (via {@link ColorVarKey}), `colorText`, and every
 * non-color scalar token. Kept in sync with {@link ThemeTokens} by hand
 * (component authors get compile-time typo-checking on every call site,
 * which a purely dynamic key type couldn't offer).
 *
 * @public
 */
export type ThemeVarKey =
  | ColorVarKey
  | 'colorText'
  | 'fontFamily'
  | 'fontSize'
  | 'fontWeightNormal'
  | 'fontWeightBold'
  | 'lineHeight'
  | 'radiusXs'
  | 'radiusSm'
  | 'radiusMd'
  | 'radiusLg'
  | 'radiusFull'
  | 'spacingXs'
  | 'spacingSm'
  | 'spacingMd'
  | 'spacingLg'
  | 'spacingXl'
  | 'shadowXs'
  | 'shadowSm'
  | 'shadowMd'
  | 'shadowLg'
  | 'shadowXl'
  | 'borderWidth'
  | 'opacityDisabled'
  | 'focusRingColor'
  | 'focusRingWidth'
  | 'transitionDuration'
  | 'transitionEasing'

// `flattenThemeTokens` returns a generic `Record<string, string>`; the
// material preset is exhaustive over every field `ThemeTokens` declares, so
// every `ThemeVarKey` is guaranteed present at runtime — this cast avoids
// `noUncheckedIndexedAccess` widening every `themeVar()` lookup to
// `string | undefined` below.
const defaultValues = flattenThemeTokens(material.tokens, 'light') as Record<ThemeVarKey, string>

/**
 * Returns `var(--cdmt-<key>, <material-light-default>)` for use inside a
 * Lit component's `styles`. The fallback means every component renders
 * correctly out of the box even if `applyTheme()` is never called.
 *
 * @public
 */
export function themeVar(key: ThemeVarKey): CSSResult {
  return unsafeCSS(`var(${toCssCustomPropertyName(key)}, ${defaultValues[key]})`)
}
