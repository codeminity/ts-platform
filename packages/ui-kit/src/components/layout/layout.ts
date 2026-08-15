import { LitElement, css, html } from 'lit'

import type { CdmtDrawer } from '../drawer/drawer.js'
import type { CdmtFooter } from '../footer/footer.js'
import type { CdmtHeader } from '../header/header.js'

interface ViewConfig {
  header: boolean
  footer: boolean
  drawerLeft: boolean
  drawerRight: boolean
}

/**
 * `<cdmt-layout>` — the outer coordinator: header/footer/drawer/page-container
 * are placed directly as children (any order, like real HTML — no explicit
 * `slot` attributes needed, this component auto-routes each by tag name),
 * and it decides which are `position: fixed` from the `view` string.
 *
 * `view` is an 11-character string — 3 for the header row, a space, 3 for
 * the middle row, a space, 3 for the footer row (default `'hhh lpr fff'`).
 * Uppercase = fixed, lowercase = static (scrolls with the page). This
 * simplified parser reads the header/footer rows as "fixed if any letter in
 * that row is uppercase" and the middle row's 1st/3rd characters as the
 * left/right drawer's fixedness — covering real-world configurations
 * (default, and "everything fixed") without the full per-column generality
 * Quasar's notation technically allows.
 *
 * Measures its header/footer/docked-drawer children's real rendered size
 * (via `ResizeObserver`) and exposes it as `--cdmt-layout-*` CSS custom
 * properties, which `<cdmt-page-container>`/`<cdmt-page>` read to offset
 * their content — see those components' own doc comments.
 *
 * @public
 */
export class CdmtLayout extends LitElement {
  static override properties = {
    view: { type: String },
    container: { type: Boolean, reflect: true }
  }

  static override styles = css`
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

  declare view: string
  declare container: boolean

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
    this.view = 'hhh lpr fff'
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
    if (changed.has('view')) {
      this.#applyViewConfig()
      this.#recomputeOffsets()
    }
  }

  #handleChildChange = (): void => {
    this.#recomputeOffsets()
  }

  #handleChildrenChanged = (): void => {
    this.#routeChildrenToSlots()
    this.#applyViewConfig()
    this.#observeChildren()
    this.#recomputeOffsets()
  }

  #parseView(): ViewConfig {
    const parts = this.view.split(' ')
    // `.split()` always returns at least one element, even for '' — so this
    // fallback is genuinely unreachable (TypeScript's `noUncheckedIndexedAccess`
    // still requires one syntactically) — on its own line so the disable
    // below doesn't also suppress footerRow's (reachable, and tested).
    // Stryker disable next-line StringLiteral
    /* v8 ignore next */
    const headerRow = parts[0] ?? ''
    // Reachable (view with fewer than 2 parts), but its exact fallback text
    // is unobservable beyond "isn't shaped like a real row" — startsWith('L')/
    // endsWith('R') below both come out false for '' or any other short
    // non-L/R-shaped string alike, so no behavioral test can tell them apart.
    // Stryker disable next-line StringLiteral
    const middleRow = parts[1] ?? ''
    const footerRow = parts[2] ?? ''

    return {
      header: /[A-Z]/.test(headerRow),
      footer: /[A-Z]/.test(footerRow),
      drawerLeft: middleRow.startsWith('L'),
      drawerRight: middleRow.endsWith('R')
    }
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

  #applyViewConfig(): void {
    const config = this.#parseView()

    this.#header?.toggleAttribute('data-cdmt-fixed', config.header)
    this.#footer?.toggleAttribute('data-cdmt-fixed', config.footer)

    const leftDrawer = this.#drawer('left')
    if (leftDrawer) leftDrawer.viewFixed = config.drawerLeft

    const rightDrawer = this.#drawer('right')
    if (rightDrawer) rightDrawer.viewFixed = config.drawerRight
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

    const headerHeight = this.#fixedHeight(header)
    const footerHeight = this.#fixedHeight(footer)
    const leftWidth = this.#dockedFixedWidth(leftDrawer)
    const rightWidth = this.#dockedFixedWidth(rightDrawer)

    this.style.setProperty('--cdmt-layout-header-height', `${String(headerHeight)}px`)
    this.style.setProperty('--cdmt-layout-footer-height', `${String(footerHeight)}px`)
    this.style.setProperty('--cdmt-layout-drawer-left-width', `${String(leftWidth)}px`)
    this.style.setProperty('--cdmt-layout-drawer-right-width', `${String(rightWidth)}px`)
  }

  #fixedHeight(element: (CdmtHeader | CdmtFooter) | null): number {
    if (!element || element.hidden || !element.hasAttribute('data-cdmt-fixed')) return 0
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
