import { unsafeCSS, type CSSResult } from 'lit'

import { toCssCustomPropertyName } from './css-custom-property-name.js'
import { material } from './presets/material.js'

import type { ThemeTokens } from './theme.type.js'

/**
 * A `var(--cdmt-<key>, <material-default>)` reference for use inside a
 * component's `static styles`. The fallback is the value actually used until
 * an ancestor sets the custom property (e.g. via `applyTheme`) — NOT a
 * `:host { --cdmt-*: ... }` declaration, which would shadow that inheritance
 * (see DECISIONS.md#adr-006).
 *
 * @internal
 */
export function themeVar(key: keyof ThemeTokens): CSSResult {
  return unsafeCSS(`var(${toCssCustomPropertyName(key)}, ${material.tokens[key]})`)
}
