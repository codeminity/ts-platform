import { css, unsafeCSS } from 'lit'

import { themeVar, themeVarText } from '../../theme/css-var.js'

// 24px per inset level is a fixed, non-themed constant (matching this
// package's existing precedent of hard-coded structural pixel values, e.g.
// <cdmt-drawer>'s own default width) — inset nesting depth isn't a themeable
// design choice the way color/spacing/radius are.
export const itemStyles = css`
  :host {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    min-height: 48px;
    gap: ${themeVar('spacingMd')};
    padding-block: var(--cdmt-list-item-padding-block, ${themeVar('spacingSm')});
    padding-inline-end: ${themeVar('spacingMd')};
    padding-inline-start: calc(${themeVar('spacingMd')} + (var(--cdmt-item-inset, 0) * 24px));
    font-family: ${themeVar('fontFamily')};
    font-size: ${themeVar('fontSize')};
    color: ${themeVar('colorText')};
  }

  :host([dense]) {
    min-height: 32px;
    padding-block: ${themeVar('spacingXs')};
  }

  :host([clickable]:not([disable])) {
    cursor: pointer;
  }

  :host([clickable]:not([disable]):hover) {
    background: ${themeVar('colorSurfaceHover')};
  }

  :host([active]) {
    background: ${themeVar('colorSurfaceHover')};
    color: ${themeVar('colorPrimary')};
  }

  :host([disable]) {
    opacity: ${themeVar('opacityDisabled')};
    pointer-events: none;
  }

  :host([clickable]:focus-visible),
  :host([clickable][focused]) {
    outline: none;
    box-shadow: ${unsafeCSS(`inset 0 0 0 ${themeVarText('focusRingWidth')} ${themeVarText('focusRingColor')}`)};
  }
`
