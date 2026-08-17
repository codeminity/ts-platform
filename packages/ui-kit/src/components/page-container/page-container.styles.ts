import { css } from 'lit'

import { themeVar } from '../../theme/css-var.js'

export const pageContainerStyles = css`
  :host {
    display: block;
    /* padding-top/bottom/left/right are set directly by <cdmt-layout> as an
       inline style, not via var() here — see CdmtLayout's own doc comment
       (in layout.ts, near #applyInset) for why: a transition on a property
       that also derives its value from a var() token never re-samples that
       token in Chromium once the transition starts. That's what makes it
       safe to transition here. */
    transition-property: padding-top, padding-bottom, padding-left, padding-right;
    transition-duration: var(--cdmt-layout-transition-duration, ${themeVar('transitionDuration')});
    transition-timing-function: ${themeVar('transitionEasing')};
  }
`
