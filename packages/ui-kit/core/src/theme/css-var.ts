import { unsafeCSS, type CSSResult } from 'lit'

import { toCssCustomPropertyName } from './css-custom-property-name.js'
import { material } from './presets/material.js'

import type { ThemeModeTokens, ThemeTokens } from './theme.type.js'

type ThemeVarKey = keyof ThemeTokens | keyof ThemeModeTokens

// Merged once at module load: brand tokens plus light-mode tokens, keyed by
// name — the same set `theme/tokens.ts` used to derive its zero-JS default
// from before it was replaced by this per-use-site pattern (see
// DECISIONS.md#adr-006). Disjoint key sets, so the spread is unambiguous.
const defaultValues: Record<ThemeVarKey, string> = {
  ...material.tokens,
  ...material.light
}

/**
 * A `var(--cdmt-<key>, <material-default>)` reference for use inside a
 * component's `static styles`. The fallback is the value actually used until
 * an ancestor sets the custom property (e.g. via `applyTheme`) — NOT a
 * `:host { --cdmt-*: ... }` declaration, which would shadow that inheritance
 * (see DECISIONS.md#adr-006).
 *
 * @internal
 */
export function themeVar(key: ThemeVarKey): CSSResult {
  return unsafeCSS(`var(${toCssCustomPropertyName(key)}, ${defaultValues[key]})`)
}
