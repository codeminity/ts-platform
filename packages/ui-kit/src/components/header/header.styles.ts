import { css } from 'lit'

import { themeVar } from '../../theme/css-var.js'

export const headerStyles = css`
  :host {
    display: block;
    box-sizing: border-box;
    background: ${themeVar('colorSurface')};
    transition-property: transform;
    transition-duration: ${themeVar('transitionDuration')};
    transition-timing-function: ${themeVar('transitionEasing')};
  }

  :host([data-cdmt-fixed]) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
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
