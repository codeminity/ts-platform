import { css } from 'lit'

export const layoutStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }

  :host(:not([container])) {
    min-height: 100vh;
  }

  :host([container]) {
    position: relative;
    height: 100%;
    overflow: auto;
  }

  .cdmt-layout__middle {
    display: flex;
    flex: 1;
  }

  ::slotted([slot='page-container']) {
    flex: 1;
    min-width: 0;
  }
`
