import { css, unsafeCSS } from 'lit'

import { themeVar, themeVarText } from '../../theme/css-var.js'

// `transition` below is scoped to `opacity` only, deliberately not
// `background-color` — a transition on the same property that also derives
// its value from an inherited custom property permanently freezes that
// property at its first-computed value in Chromium (verified: applyTheme()
// re-resolves the underlying --cdmt-* custom property correctly, but the
// transitioned property itself never re-samples it). See DECISIONS.md#adr-006.
export const buttonStyles = css`
  :host {
    display: inline-block;
  }

  button {
    font-family: ${themeVar('fontFamily')};
    font-size: ${themeVar('fontSize')};
    font-weight: ${themeVar('fontWeightNormal')};
    cursor: pointer;
    border-radius: ${themeVar('radiusMd')};
    padding-top: ${themeVar('spacingSm')};
    padding-bottom: ${themeVar('spacingSm')};
    padding-left: ${themeVar('spacingXl')};
    padding-right: ${themeVar('spacingXl')};
    border-width: ${themeVar('borderWidth')};
    border-style: solid;
    border-color: transparent;
    transition-property: opacity;
    transition-duration: ${themeVar('transitionDuration')};
    transition-timing-function: ${themeVar('transitionEasing')};
  }

  button:disabled {
    cursor: not-allowed;
    opacity: ${themeVar('opacityDisabled')};
  }

  button:focus-visible {
    outline: none;
    box-shadow: ${unsafeCSS(`0 0 0 ${themeVarText('focusRingWidth')} ${themeVarText('focusRingColor')}`)};
  }

  :host([variant='primary']) button {
    background: ${themeVar('colorPrimary')};
    color: ${themeVar('colorPrimaryForeground')};
  }

  :host([variant='primary']) button:hover:not(:disabled) {
    background: ${themeVar('colorPrimaryHover')};
  }

  :host([variant='secondary']) button {
    background: ${themeVar('colorSecondary')};
    color: ${themeVar('colorSecondaryForeground')};
  }

  :host([variant='secondary']) button:hover:not(:disabled) {
    background: ${themeVar('colorSecondaryHover')};
  }

  :host([variant='ghost']) button {
    background: transparent;
    color: ${themeVar('colorPrimary')};
    border-color: ${themeVar('colorPrimary')};
  }

  :host([variant='ghost']) button:hover:not(:disabled) {
    background: ${themeVar('colorSurfaceHover')};
  }
`
