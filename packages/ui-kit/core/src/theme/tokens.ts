import { css, unsafeCSS } from 'lit'

import { toCssCustomPropertyName } from './css-custom-property-name.js'
import { material } from './presets/material.js'

// The zero-JS fallback: every component gets these defaults even if the
// host app never calls `applyTheme` (e.g. before hydration, or an app that
// never bothers configuring a theme), while still being overridable from
// outside without touching component internals — per-instance
// (`cdmt-button { --cdmt-color-primary: ... }`) or globally
// (`applyTheme(document.documentElement, ...)`, which every shadow root
// inherits custom properties from).
//
// Generated from the `material` preset's light-mode values rather than
// duplicated by hand, so the fallback can never drift from the preset it's
// supposed to match.
const defaultTokens: Record<string, string> = { ...material.tokens, ...material.light }

const declarations = Object.entries(defaultTokens)
  .map(([key, value]) => `${toCssCustomPropertyName(key)}: ${value};`)
  .join('\n    ')

export const tokens = css`
  :host {
    ${unsafeCSS(declarations)}
  }
`
