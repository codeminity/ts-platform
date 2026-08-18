import { LitElement, html } from 'lit'

import { layoutStyles } from './layout.styles.js'

import type { CdmtDrawer } from './drawer/drawer.js'
import type { CdmtFooter } from './footer/footer.js'
import type { CdmtHeader } from './header/header.js'
import type { CdmtPageContainer } from './page-container/page-container.js'

/**
 * `<cdmt-layout>` — the outer coordinator: header/footer/drawer/page-container
 * are placed directly as children (any order, like real HTML — no explicit
 * `slot` attributes needed, this component auto-routes each by tag name).
 *
 * Eight plain boolean attributes configure it — no encoded string to parse.
 * `fixed-header`/`fixed-footer`/`fixed-left-drawer`/`fixed-right-drawer`
 * decide which pieces are `position: fixed` (pinned to the viewport) versus
 * docked (scrolls with the page, default). `header-over-left-drawer`/
 * `header-over-right-drawer`/`footer-over-left-drawer`/
 * `footer-over-right-drawer` (default `true`, matching every one of them
 * being unclaimed-by-a-drawer out of the box) decide, independently of
 * fixedness, which element visually claims each of the four corners where a
 * header/footer row meets a side drawer's column: `true` means the header/
 * footer extends the full width there (a fixed drawer on that side starts
 * below/above it instead of reaching that edge); `false` cedes the corner
 * to the drawer (the header/footer insets itself instead, and a fixed
 * drawer on that side extends all the way to that edge). These flags only
 * have a visible effect once the corresponding drawer is actually fixed —
 * a docked drawer never reaches into a header/footer's row to begin with.
 *
 * Measures its header/footer/docked-drawer children's real rendered size
 * (via `ResizeObserver`) and exposes it as `--cdmt-layout-*` CSS custom
 * properties, which `<cdmt-page-container>`/`<cdmt-page>`/`<cdmt-header>`/
 * `<cdmt-footer>`/`<cdmt-drawer>` read to offset their own content — see
 * those components' own doc comments.
 *
 * `transition-duration` optionally overrides the theme's own token for just
 * this layout's header/footer/drawer transitions — see that property's own
 * doc comment.
 *
 * @public
 */
export class CdmtLayout extends LitElement {
  static override properties = {
    fixedHeader: { type: Boolean, attribute: 'fixed-header', reflect: true },
    fixedFooter: { type: Boolean, attribute: 'fixed-footer', reflect: true },
    fixedLeftDrawer: { type: Boolean, attribute: 'fixed-left-drawer', reflect: true },
    fixedRightDrawer: { type: Boolean, attribute: 'fixed-right-drawer', reflect: true },
    headerOverLeftDrawer: { type: Boolean, attribute: 'header-over-left-drawer', reflect: true },
    headerOverRightDrawer: {
      type: Boolean,
      attribute: 'header-over-right-drawer',
      reflect: true
    },
    footerOverLeftDrawer: { type: Boolean, attribute: 'footer-over-left-drawer', reflect: true },
    footerOverRightDrawer: {
      type: Boolean,
      attribute: 'footer-over-right-drawer',
      reflect: true
    },
    container: { type: Boolean, reflect: true },
    transitionDuration: { type: String, attribute: 'transition-duration', reflect: true }
  }

  static override styles = layoutStyles

  declare fixedHeader: boolean
  declare fixedFooter: boolean
  declare fixedLeftDrawer: boolean
  declare fixedRightDrawer: boolean
  declare headerOverLeftDrawer: boolean
  declare headerOverRightDrawer: boolean
  declare footerOverLeftDrawer: boolean
  declare footerOverRightDrawer: boolean
  declare container: boolean

  /**
   * Overrides the theme's `transitionDuration` token for every transition
   * this layout coordinates — the header/footer's own transitions and the
   * drawer's open/close slide — keeping them in sync with each other.
   * Every other themed component (buttons, inputs, etc.) stays on the
   * theme's own value. Leave unset to use that same theme value here too.
   *
   * A CSS `<time>` value, e.g. `'300ms'` or `'0.3s'`.
   */
  declare transitionDuration: string | undefined

  #resizeObserver = new ResizeObserver(() => {
    this.#recomputeOffsets()
  })

  #observedElements = new Set<Element>()

  // Watches real light-DOM child insertion/removal directly — a
  // slotchange-based approach doesn't work here, since this component
  // reassigns each child's `slot` attribute itself (auto-routing by tag
  // name, so consumers don't have to write `slot="header"` by hand), and
  // that reassignment is itself a slot change, causing a self-triggering
  // loop instead of a clean one-shot "children appeared" signal.
  #mutationObserver = new MutationObserver(() => {
    this.#handleChildrenChanged()
  })

  constructor() {
    super()
    this.fixedHeader = false
    this.fixedFooter = false
    this.fixedLeftDrawer = false
    this.fixedRightDrawer = false
    this.headerOverLeftDrawer = true
    this.headerOverRightDrawer = true
    this.footerOverLeftDrawer = true
    this.footerOverRightDrawer = true
    this.container = false
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.#mutationObserver.observe(this, { childList: true })
    this.addEventListener('cdmt-layout-child-change', this.#handleChildChange)
    // Covers children already present at connect time (e.g. programmatic
    // creation) — MutationObserver only reports *changes* from here on.
    this.#handleChildrenChanged()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#resizeObserver.disconnect()
    this.#observedElements.clear()
    this.#mutationObserver.disconnect()
    this.removeEventListener('cdmt-layout-child-change', this.#handleChildChange)
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('transitionDuration')) {
      this.#applyTransitionDuration()
    }
    if (
      changed.has('fixedHeader') ||
      changed.has('fixedFooter') ||
      changed.has('fixedLeftDrawer') ||
      changed.has('fixedRightDrawer')
    ) {
      this.#applyFixedStates()
    }
    if (
      changed.has('fixedHeader') ||
      changed.has('fixedFooter') ||
      changed.has('fixedLeftDrawer') ||
      changed.has('fixedRightDrawer') ||
      changed.has('headerOverLeftDrawer') ||
      changed.has('headerOverRightDrawer') ||
      changed.has('footerOverLeftDrawer') ||
      changed.has('footerOverRightDrawer')
    ) {
      this.#recomputeOffsets()
    }
  }

  #applyTransitionDuration(): void {
    if (this.transitionDuration) {
      this.style.setProperty('--cdmt-layout-transition-duration', this.transitionDuration)
    } else {
      this.style.removeProperty('--cdmt-layout-transition-duration')
    }
  }

  #handleChildChange = (): void => {
    this.#recomputeOffsets()
  }

  #handleChildrenChanged = (): void => {
    this.#routeChildrenToSlots()
    this.#applyFixedStates()
    this.#observeChildren()
    this.#recomputeOffsets()
  }

  #routeChildrenToSlots(): void {
    for (const child of Array.from(this.children)) {
      switch (child.tagName.toLowerCase()) {
        case 'cdmt-header':
          child.slot = 'header'
          break
        case 'cdmt-footer':
          child.slot = 'footer'
          break
        case 'cdmt-page-container':
          child.slot = 'page-container'
          break
        case 'cdmt-drawer':
          child.slot = (child as CdmtDrawer).side === 'right' ? 'drawer-right' : 'drawer-left'
          break
        // No default — an unrecognized tag is deliberately left unrouted,
        // falling through to the plain default `<slot>` in render() below.
      }
    }
  }

  #applyFixedStates(): void {
    this.#header?.toggleAttribute('data-cdmt-fixed', this.fixedHeader)
    this.#footer?.toggleAttribute('data-cdmt-fixed', this.fixedFooter)

    const leftDrawer = this.#drawer('left')
    if (leftDrawer) leftDrawer.viewFixed = this.fixedLeftDrawer

    const rightDrawer = this.#drawer('right')
    if (rightDrawer) rightDrawer.viewFixed = this.fixedRightDrawer
  }

  #observeChildren(): void {
    for (const element of this.#observedElements) this.#resizeObserver.unobserve(element)
    this.#observedElements.clear()

    const targets = [this.#header, this.#footer, this.#drawer('left'), this.#drawer('right')]
    for (const target of targets) {
      if (!target) continue
      this.#resizeObserver.observe(target)
      this.#observedElements.add(target)
    }
  }

  get #header(): CdmtHeader | null {
    return this.querySelector('cdmt-header')
  }

  get #footer(): CdmtFooter | null {
    return this.querySelector('cdmt-footer')
  }

  get #pageContainer(): CdmtPageContainer | null {
    return this.querySelector('cdmt-page-container')
  }

  #drawer(side: 'left' | 'right'): CdmtDrawer | null {
    for (const drawer of this.querySelectorAll('cdmt-drawer')) {
      if (drawer.side === side) return drawer
    }
    return null
  }

  #recomputeOffsets(): void {
    const header = this.#header
    const footer = this.#footer
    const leftDrawer = this.#drawer('left')
    const rightDrawer = this.#drawer('right')

    const headerFixedHeight = this.#fixedHeight(header)
    const footerFixedHeight = this.#fixedHeight(footer)
    const headerRealHeight = this.#realHeight(header)
    const footerRealHeight = this.#realHeight(footer)
    const leftDockedFixedWidth = this.#dockedFixedWidth(leftDrawer)
    const rightDockedFixedWidth = this.#dockedFixedWidth(rightDrawer)

    // <cdmt-page-container>'s own padding — driven purely by fixedness,
    // unaffected by corner ownership: a fixed header/footer always removes
    // itself from flow (needs padding to compensate) regardless of which
    // corners it claims, and a docked-and-fixed drawer always reserves its
    // own width the same way. Applied as a direct inline style, not a
    // CSS var() — see #applyInset's own comment for why.
    const pageContainer = this.#pageContainer
    if (pageContainer) {
      pageContainer.style.paddingTop = `${String(headerFixedHeight)}px`
      pageContainer.style.paddingBottom = `${String(footerFixedHeight)}px`
      pageContainer.style.paddingLeft = `${String(leftDockedFixedWidth)}px`
      pageContainer.style.paddingRight = `${String(rightDockedFixedWidth)}px`
    }

    // <cdmt-header>/<cdmt-footer>'s own horizontal inset: only when the
    // drawer on that side is actually docked-and-fixed (a docked, non-fixed
    // drawer never reaches into their row; an overlay/mobile one is
    // temporary and deliberately allowed to cover them) *and* this
    // header/footer cedes that specific corner to it. Applied as a direct
    // inline style, not a CSS var() — see #applyInset's own comment for why.
    this.#applyInset(
      header,
      this.fixedHeader,
      this.headerOverLeftDrawer ? 0 : leftDockedFixedWidth,
      this.headerOverRightDrawer ? 0 : rightDockedFixedWidth
    )
    this.#applyInset(
      footer,
      this.fixedFooter,
      this.footerOverLeftDrawer ? 0 : leftDockedFixedWidth,
      this.footerOverRightDrawer ? 0 : rightDockedFixedWidth
    )

    // <cdmt-drawer>'s own margin-top/margin-bottom, docked (non-fixed) mode
    // only: a fixed header/footer is removed from normal flow, so the flex
    // row a docked drawer shares with it starts right at the very
    // top/bottom of the viewport — <cdmt-page-container> already offsets
    // its own content for that via padding (above), but a docked drawer has
    // nothing accounting for it on its own, and would render sliding
    // underneath the fixed header/footer instead of below/above it. Only
    // applies while not fixed — a fixed drawer already gets its own
    // top/bottom inset from its own stylesheet, and doubling it here would
    // push it too far. Applied as a direct inline style, not a CSS var() —
    // see #applyInset's own comment for why.
    this.#applyDockedDrawerMargin(leftDrawer, headerFixedHeight, footerFixedHeight)
    this.#applyDockedDrawerMargin(rightDrawer, headerFixedHeight, footerFixedHeight)

    // <cdmt-drawer>'s own vertical inset, per side: a *fixed* drawer clears
    // a header/footer's real space (regardless of the header/footer's own
    // fixedness — a docked one is still visually there) only when that
    // header/footer actually claims this drawer's corner; otherwise the
    // drawer extends all the way to that edge itself.
    this.style.setProperty(
      '--cdmt-layout-drawer-left-top-inset',
      `${String(this.headerOverLeftDrawer ? headerRealHeight : 0)}px`
    )
    this.style.setProperty(
      '--cdmt-layout-drawer-left-bottom-inset',
      `${String(this.footerOverLeftDrawer ? footerRealHeight : 0)}px`
    )
    this.style.setProperty(
      '--cdmt-layout-drawer-right-top-inset',
      `${String(this.headerOverRightDrawer ? headerRealHeight : 0)}px`
    )
    this.style.setProperty(
      '--cdmt-layout-drawer-right-bottom-inset',
      `${String(this.footerOverRightDrawer ? footerRealHeight : 0)}px`
    )
  }

  // Sets left/right (fixed mode) or margin-left/margin-right (docked mode)
  // directly as an inline style, never through a CSS var() — a transition on
  // a property that also derives its value from an inherited var() token
  // never re-samples that token in Chromium once the transition starts (see
  // DECISIONS.md#adr-006, and <cdmt-page-container>'s own doc comment for
  // where this was first confirmed). Only one pair is ever meaningful at a
  // time (mirrors header.styles.ts/footer.styles.ts's own fixed-vs-docked
  // split), but the inactive pair is still reset — a fixed header keeping a
  // stale inline margin-left from a previous docked state would double-count
  // that offset on top of `left`.
  #applyInset(
    element: (CdmtHeader | CdmtFooter) | null,
    fixed: boolean,
    left: number,
    right: number
  ): void {
    if (!element) return
    element.style.marginLeft = fixed ? '' : `${String(left)}px`
    element.style.marginRight = fixed ? '' : `${String(right)}px`
    element.style.left = fixed ? `${String(left)}px` : ''
    element.style.right = fixed ? `${String(right)}px` : ''
  }

  #applyDockedDrawerMargin(
    drawer: CdmtDrawer | null,
    headerFixedHeight: number,
    footerFixedHeight: number
  ): void {
    if (!drawer) return
    const fixed = drawer.hasAttribute('data-cdmt-fixed')
    drawer.style.marginTop = fixed ? '' : `${String(headerFixedHeight)}px`
    drawer.style.marginBottom = fixed ? '' : `${String(footerFixedHeight)}px`
  }

  #fixedHeight(element: (CdmtHeader | CdmtFooter) | null): number {
    if (!element || element.hidden || !element.hasAttribute('data-cdmt-fixed')) return 0
    return element.getBoundingClientRect().height
  }

  // Unlike #fixedHeight (0 whenever the element isn't fixed — correct for
  // <cdmt-page-container>'s own padding, which a docked header/footer
  // doesn't need at all, since it already pushes page-container down via
  // normal flex flow), a *fixed* <cdmt-drawer> that's being told to clear a
  // header/footer's corner needs that header/footer's real screen space
  // either way: a docked one is still visually there, just not removed
  // from flow.
  #realHeight(element: (CdmtHeader | CdmtFooter) | null): number {
    if (!element || element.hidden) return 0
    return element.getBoundingClientRect().height
  }

  // A docked-but-*static* drawer already takes flex space naturally (it's
  // still in normal flow) — page-container must not ALSO pad for it, or
  // the space gets reserved twice. Only a docked-and-fixed drawer (pulled
  // out of flow by its own `position: fixed`) needs this padding.
  #dockedFixedWidth(drawer: CdmtDrawer | null): number {
    if (!drawer || drawer.hidden || !drawer.isDocked || !drawer.hasAttribute('data-cdmt-fixed')) {
      return 0
    }
    return drawer.getBoundingClientRect().width
  }

  override render() {
    return html`
      <slot name="header"></slot>
      <div class="cdmt-layout__middle">
        <slot name="drawer-left"></slot>
        <slot name="page-container"></slot>
        <slot name="drawer-right"></slot>
      </div>
      <slot name="footer"></slot>
      <slot></slot>
    `
  }
}

customElements.define('cdmt-layout', CdmtLayout)

declare global {
  interface HTMLElementTagNameMap {
    'cdmt-layout': CdmtLayout
  }
}
