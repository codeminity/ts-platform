import { css, unsafeCSS } from 'lit'

import { themeVar, themeVarText } from '../../../theme/css-var.js'

export const inputStyles = css`
  :host {
    display: inline-block;
  }

  input {
    box-sizing: border-box;
    width: 100%;
    font-family: ${themeVar('fontFamily')};
    font-size: ${themeVar('fontSize')};
    color: ${themeVar('colorText')};
    background: ${themeVar('colorSurface')};
    padding-top: ${themeVar('spacingSm')};
    padding-bottom: ${themeVar('spacingSm')};
    padding-left: ${themeVar('spacingMd')};
    padding-right: ${themeVar('spacingMd')};
    border-radius: ${themeVar('radiusMd')};
    border-width: ${themeVar('borderWidth')};
    border-style: solid;
    border-color: ${themeVar('colorBorder')};
    transition-property: opacity;
    transition-duration: ${themeVar('transitionDuration')};
    transition-timing-function: ${themeVar('transitionEasing')};
  }

  input:disabled {
    cursor: not-allowed;
    opacity: ${themeVar('opacityDisabled')};
  }

  input:focus {
    outline: none;
    border-color: ${themeVar('colorPrimary')};
    box-shadow: ${unsafeCSS(`0 0 0 ${themeVarText('focusRingWidth')} ${themeVarText('focusRingColor')}`)};
  }

  :host([invalid]) input {
    border-color: ${themeVar('colorNegative')};
  }
`
