import { css } from 'lit'

import { themeVar } from '../../../theme/css-var.js'

export const footerStyles = css`
  :host {
    display: block;
    box-sizing: border-box;
    background: ${themeVar('colorSurface')};
    /* Same reasoning as <cdmt-header>'s own equivalent rule: left/right/
       margin-left/margin-right are set directly by <cdmt-layout> as an
       inline style, not via var() here — see CdmtLayout#applyInset's own
       comment for why. */
    transition-property: transform, left, right, margin-left, margin-right;
    transition-duration: var(--cdmt-layout-transition-duration, ${themeVar('transitionDuration')});
    transition-timing-function: ${themeVar('transitionEasing')};
  }

  :host([data-cdmt-fixed]) {
    position: fixed;
    bottom: 0;
    z-index: 2000;
  }

  :host([bordered]) {
    border-top-width: ${themeVar('borderWidth')};
    border-top-style: solid;
    border-top-color: ${themeVar('colorBorder')};
  }

  :host([elevated]) {
    box-shadow: ${themeVar('shadowMd')};
  }

  :host([data-cdmt-revealed='false']) {
    transform: translateY(100%);
  }
`
