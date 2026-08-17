import { css } from 'lit'

import { themeVar } from '../../theme/css-var.js'

export const listStyles = css`
  :host {
    display: block;
    box-sizing: border-box;
    font-family: ${themeVar('fontFamily')};
    /* Read by <cdmt-item>'s own padding-block — inherits through the flat
       tree into slotted light-DOM content the same way any other CSS custom
       property does, so a list's density controls its items' without any
       JS wiring between the two components. */
    --cdmt-list-item-padding-block: ${themeVar('spacingSm')};
  }

  :host([dense]) {
    --cdmt-list-item-padding-block: ${themeVar('spacingXs')};
  }

  :host([bordered]) {
    border-width: ${themeVar('borderWidth')};
    border-style: solid;
    border-color: ${themeVar('colorBorder')};
    border-radius: ${themeVar('radiusMd')};
  }

  :host([padding]) {
    padding-block: ${themeVar('spacingSm')};
  }

  :host([separator]) ::slotted(cdmt-item:not(:last-child)) {
    border-bottom-width: ${themeVar('borderWidth')};
    border-bottom-style: solid;
    border-bottom-color: ${themeVar('colorBorder')};
  }
`
