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

  /* A fixed header/footer is removed from normal flow, so .cdmt-layout__middle
       starts right at the very top/bottom of the viewport — <cdmt-page-container>
       already offsets its own content for that via padding, but a *docked*
       (non-fixed) drawer sharing that same flex row has nothing accounting for
       it, and would render sliding underneath the fixed header/footer instead
       of below/above it. Only applies while NOT fixed — a fixed drawer already
       gets its own top/bottom offset from :host([data-cdmt-fixed])'s own rule
       in drawer.ts, and doubling it there would push it too far. */
  ::slotted([slot='drawer-left']:not([data-cdmt-fixed])),
  ::slotted([slot='drawer-right']:not([data-cdmt-fixed])) {
    margin-top: var(--cdmt-layout-header-height, 0px);
    margin-bottom: var(--cdmt-layout-footer-height, 0px);
  }
`
