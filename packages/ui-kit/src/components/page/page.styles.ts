import { css } from 'lit'

import { themeVar } from '../../theme/css-var.js'

export const pageStyles = css`
  :host {
    display: block;
    box-sizing: border-box;
    min-height: calc(
      100vh - var(--cdmt-layout-header-height, 0px) - var(--cdmt-layout-footer-height, 0px)
    );
  }

  :host([padding]) {
    padding: ${themeVar('spacingLg')};
  }
`
