import { css } from 'lit'

import { themeVar } from '../../theme/css-var.js'

export const drawerStyles = css`
  :host {
    display: block;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    background: ${themeVar('colorSurface')};
    /* Width is set directly (this.style.width, not a CSS custom property)
       specifically so it stays safely transitionable — see DECISIONS.md#adr-006:
       a transition on a property that also derives its value from a var()
       token never re-samples that token in Chromium, confirmed directly
       while building <cdmt-page-container>'s offset padding. */
    /* No transition until data-cdmt-transitions-enabled — see that
       attribute's own comment on #firstUpdated below for why. */
    transition: none;
  }

  :host([data-cdmt-transitions-enabled]) {
    transition-property: transform, width;
    transition-duration: ${themeVar('transitionDuration')};
    transition-timing-function: ${themeVar('transitionEasing')};
  }

  :host([data-cdmt-transitions-enabled][data-cdmt-no-mini-animation]) {
    transition-property: transform;
    transition-duration: ${themeVar('transitionDuration')};
    transition-timing-function: ${themeVar('transitionEasing')};
  }

  /* No visibility toggle here on purpose — visibility is inherited, so a
     parent-level visibility:hidden would also silently hide the backdrop
     (a shadow sibling that otherwise controls its own show/hide purely via
     opacity), and flipping an untransitioned inherited value instantly
     masked whatever transition was supposed to play, on both this host and
     the backdrop. A docked (non-fixed) drawer collapses via its own width
     transitioning to 0 instead (see #syncWidthVar) — nothing further is
     needed here. A fixed/overlay drawer slides fully off-screen below,
     which alone is enough to make it visually and functionally gone. */
  :host([hidden]) {
    display: block;
    pointer-events: none;
  }

  :host([data-cdmt-fixed][side='left'][hidden]) {
    transform: translateX(-100%);
  }

  :host([data-cdmt-fixed][side='right'][hidden]) {
    transform: translateX(100%);
  }

  :host([data-cdmt-fixed]) {
    position: fixed;
    top: var(--cdmt-layout-header-height, 0px);
    bottom: var(--cdmt-layout-footer-height, 0px);
    z-index: 2100;
    height: auto;
  }

  /* A docked-but-fixed drawer (a desktop sidebar sitting alongside a fixed
     header/footer) correctly offsets by their height above, so it doesn't
     overlap them. A mobile/overlay-mode drawer isn't docked at all — it's
     a full-screen-style overlay covering everything, including visually
     behind the header, so unlike the docked case it spans the full
     viewport regardless of header/footer height. */
  :host([data-cdmt-overlay-fixed]) {
    top: 0;
    bottom: 0;
  }

  :host([side='left']) {
    left: 0;
  }

  :host([side='right']) {
    right: 0;
  }

  :host([bordered][side='left']) {
    border-right-width: ${themeVar('borderWidth')};
    border-right-style: solid;
    border-right-color: ${themeVar('colorBorder')};
  }

  :host([bordered][side='right']) {
    border-left-width: ${themeVar('borderWidth')};
    border-left-style: solid;
    border-left-color: ${themeVar('colorBorder')};
  }

  :host([elevated]) {
    box-shadow: ${themeVar('shadowLg')};
  }

  .cdmt-drawer__backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.4);
    z-index: 2050;
    opacity: 0;
    pointer-events: none;
    transition-property: opacity;
    transition-duration: ${themeVar('transitionDuration')};
    transition-timing-function: ${themeVar('transitionEasing')};
  }

  .cdmt-drawer__backdrop--visible {
    opacity: 1;
    pointer-events: auto;
  }

  /* Both slot wrappers paint above the backdrop (which also covers this
     component's own bounding box, not just the rest of the page) — and
     carry their own opaque background, sized to fully cover the host's own
     box (position:absolute + inset:0, anchored by :host's own position).
     Without the opaque background, the backdrop's dim tint would still
     show through any part of the drawer's own panel that isn't itself
     opaque (e.g. the gaps between nav links), even once painted above it. */
  .cdmt-drawer__default-slot,
  .cdmt-drawer__mini-slot {
    position: absolute;
    inset: 0;
    z-index: 2051;
    background: ${themeVar('colorSurface')};
  }

  .cdmt-drawer__mini-slot {
    display: none;
  }

  :host([mini]) .cdmt-drawer__mini-slot {
    display: block;
  }

  :host([mini]) .cdmt-drawer__default-slot {
    display: none;
  }
`
