import { css } from 'lit'

import { themeVar } from '../../../theme/css-var.js'

export const headerStyles = css`
  :host {
    display: block;
    box-sizing: border-box;
    background: ${themeVar('colorSurface')};
    /* left/right/margin-left/margin-right (the docked-vs-fixed horizontal
       inset from a corner-claiming drawer) are set directly by
       <cdmt-layout> as an inline style, not via var() here — see
       CdmtLayout#applyInset's own comment for why (the same Chromium
       var()-derived-property transition freeze documented on
       <cdmt-page-container>, DECISIONS.md#adr-006). That's what makes it
       safe to list them here. */
    transition-property: transform, left, right, margin-left, margin-right;
    transition-duration: var(--cdmt-layout-transition-duration, ${themeVar('transitionDuration')});
    transition-timing-function: ${themeVar('transitionEasing')};
  }

  :host([data-cdmt-fixed]) {
    position: fixed;
    top: 0;
    z-index: 2000;
  }

  :host([bordered]) {
    border-bottom-width: ${themeVar('borderWidth')};
    border-bottom-style: solid;
    border-bottom-color: ${themeVar('colorBorder')};
  }

  :host([elevated]) {
    box-shadow: ${themeVar('shadowMd')};
  }

  :host([data-cdmt-revealed='false']) {
    transform: translateY(-100%);
  }
`
