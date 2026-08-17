import { css } from 'lit'

import { themeVar } from '../../theme/css-var.js'

export const drawerStyles = css`
  :host {
    display: block;
    box-sizing: border-box;
  }

  /* Docked (non-fixed) and docked-and-fixed (permanent sidebar) modes: the
     host IS the sized/visible box, exactly as it always has been. Neither
     mode ever shows a backdrop (see #isBackdropVisible — it requires
     !isDocked), so the transform-creates-a-containing-block issue that
     overlay mode has to work around below never applies here. */
  :host(:not([data-cdmt-overlay-fixed])) {
    overflow: hidden;
    position: relative;
    z-index: 0;
    background: ${themeVar('colorSurface')};
    /* No transition until data-cdmt-transitions-enabled — see that
       attribute's own comment on #firstUpdated below for why. */
    transition: none;
  }

  :host(:not([data-cdmt-overlay-fixed])[data-cdmt-transitions-enabled]) {
    transition-property: transform, width;
    transition-duration: var(--cdmt-layout-transition-duration, ${themeVar('transitionDuration')});
    transition-timing-function: ${themeVar('transitionEasing')};
  }

  :host(
    :not([data-cdmt-overlay-fixed])[data-cdmt-transitions-enabled][data-cdmt-no-mini-animation]
  ) {
    transition-property: transform;
    transition-duration: var(--cdmt-layout-transition-duration, ${themeVar('transitionDuration')});
    transition-timing-function: ${themeVar('transitionEasing')};
  }

  :host([data-cdmt-fixed]:not([data-cdmt-overlay-fixed])[side='left'][hidden]) {
    transform: translateX(-100%);
  }

  :host([data-cdmt-fixed]:not([data-cdmt-overlay-fixed])[side='right'][hidden]) {
    transform: translateX(100%);
  }

  :host([data-cdmt-fixed]:not([data-cdmt-overlay-fixed])) {
    position: fixed;
    z-index: 2100;
    height: auto;
  }

  /* Per-side top/bottom, driven by <cdmt-layout>'s own
     --cdmt-layout-drawer-left/right-top/bottom-inset vars: 0px whenever the
     header/footer on that side *cedes* this drawer's corner
     (header-over-drawer-left/right or footer-over-drawer-left/right set to
     false) — the drawer then extends all the way to that edge itself,
     rather than being inset by a header/footer's height. When the
     header/footer instead *claims* the corner (the default), the drawer
     clears that header/footer's real screen space, regardless of whether
     that header/footer itself is fixed or just docked (a docked one is
     still visually there, just not removed from flow). This only applies to
     the docked-and-fixed (permanent sidebar) case — overlay/mobile mode's
     .cdmt-drawer__panel always spans the full viewport height instead, see
     below. */
  :host([data-cdmt-fixed][side='left']:not([data-cdmt-overlay-fixed])) {
    top: var(--cdmt-layout-drawer-left-top-inset, 0px);
    bottom: var(--cdmt-layout-drawer-left-bottom-inset, 0px);
  }

  :host([data-cdmt-fixed][side='right']:not([data-cdmt-overlay-fixed])) {
    top: var(--cdmt-layout-drawer-right-top-inset, 0px);
    bottom: var(--cdmt-layout-drawer-right-bottom-inset, 0px);
  }

  :host(:not([data-cdmt-overlay-fixed])[side='left']) {
    left: 0;
  }

  :host(:not([data-cdmt-overlay-fixed])[side='right']) {
    right: 0;
  }

  :host([bordered]:not([data-cdmt-overlay-fixed])[side='left']) {
    border-right-width: ${themeVar('borderWidth')};
    border-right-style: solid;
    border-right-color: ${themeVar('colorBorder')};
  }

  :host([bordered]:not([data-cdmt-overlay-fixed])[side='right']) {
    border-left-width: ${themeVar('borderWidth')};
    border-left-style: solid;
    border-left-color: ${themeVar('colorBorder')};
  }

  :host([elevated]:not([data-cdmt-overlay-fixed])) {
    box-shadow: ${themeVar('shadowLg')};
  }

  /* Mobile/overlay mode: unlike every mode above, this drawer shows a
     backdrop (see #isBackdropVisible) that must stay fixed to the real
     viewport. If the host itself carried a transform here (the way it does
     for the docked-and-fixed slide above) it would establish a NEW
     containing block for any position:fixed descendant — including the
     backdrop, which is a shadow-root *sibling* of .cdmt-drawer__panel
     below, not nested inside it, specifically so this can never happen.
     Confirmed directly: before this split, the backdrop's own
     position:fixed; inset:0 resolved against the host's own (small,
     sliding) box instead of the viewport — clipped to a ~200px sliver that
     tracked the drawer's own translateX, only looking "correct" once the
     slide finished (matching getBoundingClientRect() on both host and
     backdrop instead of the real viewport size). The host itself is now
     reduced to a zero-visual-effect wrapper for this mode: position:absolute
     removes it from <cdmt-layout>'s flex row (same as position:fixed would)
     without ever creating a containing block, and .cdmt-drawer__panel below
     owns the real fixed positioning, sizing, and visible surface instead. */
  :host([data-cdmt-overlay-fixed]) {
    position: absolute;
    z-index: auto;
  }

  .cdmt-drawer__panel {
    box-sizing: border-box;
  }

  :host([data-cdmt-overlay-fixed]) .cdmt-drawer__panel {
    position: fixed;
    top: 0;
    bottom: 0;
    /* Mirrors the host's own real (JS-set, see #syncWidthVar) width — the
       inherit keyword reads the host's current *computed* width, so this
       stays in sync without needing its own JS wiring. */
    width: inherit;
    z-index: 2100;
    overflow: hidden;
    background: ${themeVar('colorSurface')};
    transition: none;
  }

  :host([data-cdmt-overlay-fixed][data-cdmt-transitions-enabled]) .cdmt-drawer__panel {
    transition-property: transform, width;
    transition-duration: var(--cdmt-layout-transition-duration, ${themeVar('transitionDuration')});
    transition-timing-function: ${themeVar('transitionEasing')};
  }

  :host([data-cdmt-overlay-fixed][data-cdmt-transitions-enabled][data-cdmt-no-mini-animation])
    .cdmt-drawer__panel {
    transition-property: transform;
    transition-duration: var(--cdmt-layout-transition-duration, ${themeVar('transitionDuration')});
    transition-timing-function: ${themeVar('transitionEasing')};
  }

  :host([data-cdmt-overlay-fixed][side='left']) .cdmt-drawer__panel {
    left: 0;
  }

  :host([data-cdmt-overlay-fixed][side='right']) .cdmt-drawer__panel {
    right: 0;
  }

  :host([data-cdmt-overlay-fixed][side='left'][hidden]) .cdmt-drawer__panel {
    transform: translateX(-100%);
  }

  :host([data-cdmt-overlay-fixed][side='right'][hidden]) .cdmt-drawer__panel {
    transform: translateX(100%);
  }

  :host([data-cdmt-overlay-fixed][bordered][side='left']) .cdmt-drawer__panel {
    border-right-width: ${themeVar('borderWidth')};
    border-right-style: solid;
    border-right-color: ${themeVar('colorBorder')};
  }

  :host([data-cdmt-overlay-fixed][bordered][side='right']) .cdmt-drawer__panel {
    border-left-width: ${themeVar('borderWidth')};
    border-left-style: solid;
    border-left-color: ${themeVar('colorBorder')};
  }

  :host([data-cdmt-overlay-fixed][elevated]) .cdmt-drawer__panel {
    box-shadow: ${themeVar('shadowLg')};
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

  .cdmt-drawer__backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.4);
    z-index: 2050;
    opacity: 0;
    pointer-events: none;
    transition-property: opacity;
    transition-duration: var(--cdmt-layout-transition-duration, ${themeVar('transitionDuration')});
    transition-timing-function: ${themeVar('transitionEasing')};
  }

  .cdmt-drawer__backdrop--visible {
    opacity: 1;
    pointer-events: auto;
  }

  /* Both slot wrappers paint above the backdrop (which also covers this
     component's own bounding box, not just the rest of the page) — and
     carry their own opaque background, sized to fully cover the nearest
     positioned ancestor's box (.cdmt-drawer__panel in overlay/mobile mode,
     the host directly in every other mode — .cdmt-drawer__panel only gets a
     position value at all, i.e. is actually in that ancestor chain, for
     overlay mode; see its own rule above). Without the opaque background,
     the backdrop's dim tint would still show through any part of the
     drawer's own panel that isn't itself opaque (e.g. the gaps between nav
     links), even once painted above it. */
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
