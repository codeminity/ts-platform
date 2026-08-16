import { css } from 'lit'

export const pageContainerStyles = css`
  :host {
    display: block;
    padding-top: var(--cdmt-layout-header-height, 0px);
    padding-bottom: var(--cdmt-layout-footer-height, 0px);
    padding-left: var(--cdmt-layout-drawer-left-width, 0px);
    padding-right: var(--cdmt-layout-drawer-right-width, 0px);
  }
`
