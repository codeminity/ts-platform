import { css } from 'lit'

import { themeVar } from '../../theme/css-var.js'

export const itemLabelStyles = css`
  :host {
    display: block;
    font-family: ${themeVar('fontFamily')};
    font-size: ${themeVar('fontSize')};
    font-weight: ${themeVar('fontWeightNormal')};
    line-height: ${themeVar('lineHeight')};
    color: ${themeVar('colorText')};
  }

  :host([header]) {
    font-size: 1.25em;
    font-weight: ${themeVar('fontWeightBold')};
  }

  :host([overline]) {
    font-size: 0.75em;
    font-weight: ${themeVar('fontWeightBold')};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.7;
  }

  :host([caption]) {
    font-size: 0.85em;
    opacity: 0.7;
  }
`
