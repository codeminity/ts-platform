import { css } from 'lit'

import { themeVar } from '../../theme/css-var.js'

export const pageStyles = css`
  :host {
    display: block;
    box-sizing: border-box;
    /* Inherits its parent <cdmt-page-container>'s own real height (itself
       already correct — a flex-stretched sibling of <cdmt-layout>'s other
       row content) instead of re-deriving "100vh minus header/footer"
       independently. That independent calc() only ever subtracted a
       *fixed* header/footer's height (via the same --cdmt-layout-* vars
       <cdmt-page-container> reads for its own padding — 0 for a docked,
       non-fixed one), silently ignoring that a *docked* header/footer
       still consumes its own real space as a genuine flex sibling. A real
       regression, confirmed directly: with a fixed header and a docked
       (non-fixed) footer — this repo's own docs app's actual layout — the
       page still tried to fill "100vh minus the fixed header's height"
       even though the docked footer, rendered *after* it, added its own
       height on top of that, overflowing the true viewport height and
       forcing a scrollbar on pages with barely any real content.
       min-height (not height): a page with genuinely tall content must
       still grow past this floor and scroll normally — confirmed directly,
       unaffected by this change either way. */
    min-height: 100%;
  }

  :host([padding]) {
    padding: ${themeVar('spacingLg')};
  }
`
