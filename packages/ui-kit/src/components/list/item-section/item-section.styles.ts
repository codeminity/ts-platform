import { css } from 'lit'

import { themeVar } from '../../../theme/css-var.js'

export const itemSectionStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    flex: 1 1 0%;
    font-family: ${themeVar('fontFamily')};
    font-size: ${themeVar('fontSize')};
    line-height: ${themeVar('lineHeight')};
    color: ${themeVar('colorText')};
  }

  :host([top]) {
    justify-content: flex-start;
  }

  :host([avatar]) {
    flex: 0 0 auto;
    min-width: 56px;
    align-items: center;
  }

  :host([thumbnail]) {
    flex: 0 0 auto;
    min-width: 100px;
    align-items: center;
  }

  :host([side]) {
    flex: 0 0 auto;
    align-items: center;
  }

  :host([no-wrap]) {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`
