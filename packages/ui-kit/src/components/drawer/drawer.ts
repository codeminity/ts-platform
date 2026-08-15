import { LitElement, css, html } from 'lit'

import { themeVar } from '../../theme/css-var.js'

/**
 * @public
 */
export type CdmtDrawerSide = 'left' | 'right'

/**
 * @public
 */
export type CdmtDrawerBehavior = 'default' | 'desktop' | 'mobile'

/**
 * `<cdmt-drawer>` — a side panel inside `<cdmt-layout>`. In "mobile mode"
 * (viewport narrower than `breakpoint`, or `behavior="mobile"`) it always
 * behaves as an overlay with a backdrop, regardless of the `overlay` prop —
 * matching Quasar's own documented behavior. `persistent` blocks backdrop
 * click / Escape from closing it; a real close still works via `hide()`,
 * `toggle()`, or setting `model-value` false.
 *
 * Whether it renders fixed (vs. pushing/pulling page content statically) is
 * decided by the parent `<cdmt-layout>`'s `view` string, marked via an
 * internal `data-cdmt-fixed` attribute — except in mobile mode or `overlay`,
 * which force fixed positioning unconditionally (Quasar's documented rule).
 *
 * @public
 */
export class CdmtDrawer extends LitElement {
  static override properties = {
    modelValue: { type: Boolean, attribute: 'model-value' },
    side: { type: String, reflect: true },
    overlay: { type: Boolean, reflect: true },
    width: { type: Number },
    mini: { type: Boolean, reflect: true },
    miniWidth: { type: Number, attribute: 'mini-width' },
    miniToOverlay: { type: Boolean, attribute: 'mini-to-overlay' },
    noMiniAnimation: { type: Boolean, attribute: 'no-mini-animation' },
    breakpoint: { type: Number },
    behavior: { type: String },
    bordered: { type: Boolean, reflect: true },
    elevated: { type: Boolean, reflect: true },
    persistent: { type: Boolean },
    showIfAbove: { type: Boolean, attribute: 'show-if-above' },
    // Set by the parent <cdmt-layout> from its `view` string parsing — not
    // a public prop consumers set themselves, hence no attribute.
    viewFixed: { attribute: false }
  }

  static override styles = css`
    :host {
      display: block;
      box-sizing: border-box;
      overflow: hidden;
      background: ${themeVar('colorSurface')};
      /* Width is set directly (this.style.width, not a CSS custom property)
         specifically so it stays safely transitionable — see DECISIONS.md#adr-006:
         a transition on a property that also derives its value from a var()
         token never re-samples that token in Chromium, confirmed directly
         while building <cdmt-page-container>'s offset padding. */
      transition:
        transform ${themeVar('transitionDuration')} ${themeVar('transitionEasing')},
        width ${themeVar('transitionDuration')} ${themeVar('transitionEasing')};
    }

    :host([data-cdmt-no-mini-animation]) {
      transition: transform ${themeVar('transitionDuration')} ${themeVar('transitionEasing')};
    }

    :host([hidden]) {
      display: block;
      visibility: hidden;
    }

    :host([side='left'][hidden]) {
      transform: translateX(-100%);
    }

    :host([side='right'][hidden]) {
      transform: translateX(100%);
    }

    :host([data-cdmt-fixed]) {
      position: fixed;
      top: var(--cdmt-layout-header-height, 0px);
      bottom: var(--cdmt-layout-footer-height, 0px);
      z-index: 2100;
      height: auto;
    }

    :host([side='left']) {
      left: 0;
    }

    :host([side='right']) {
      right: 0;
    }

    :host([bordered][side='left']) {
      border-right: ${themeVar('borderWidth')} solid ${themeVar('colorBorder')};
    }

    :host([bordered][side='right']) {
      border-left: ${themeVar('borderWidth')} solid ${themeVar('colorBorder')};
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
      transition: opacity ${themeVar('transitionDuration')} ${themeVar('transitionEasing')};
    }

    .cdmt-drawer__backdrop--visible {
      opacity: 1;
      pointer-events: auto;
    }

    /* Both slot wrappers paint above the backdrop (which also covers this
       component's own bounding box, not just the rest of the page) —
       without this, the drawer's own panel would be behind its backdrop. */
    .cdmt-drawer__default-slot,
    .cdmt-drawer__mini-slot {
      position: relative;
      z-index: 1;
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

  declare modelValue: boolean
  declare side: CdmtDrawerSide
  declare overlay: boolean
  declare width: number
  declare mini: boolean
  declare miniWidth: number
  declare miniToOverlay: boolean
  declare noMiniAnimation: boolean
  declare breakpoint: number
  declare behavior: CdmtDrawerBehavior
  declare bordered: boolean
  declare elevated: boolean
  declare persistent: boolean
  declare showIfAbove: boolean
  declare viewFixed: boolean

  #isMobileMode = false
  #mediaQuery: MediaQueryList | undefined

  constructor() {
    super()
    this.modelValue = false
    this.side = 'left'
    this.overlay = false
    this.width = 300
    this.mini = false
    this.miniWidth = 57
    this.miniToOverlay = false
    this.noMiniAnimation = false
    this.breakpoint = 1023
    this.behavior = 'default'
    this.bordered = false
    this.elevated = false
    this.persistent = false
    this.showIfAbove = false
    this.viewFixed = false
  }

  // Lit's `updated()` fires on the *first* render too — a reactive property
  // set in the constructor (every property here is) already counts as
  // "changed" on that first cycle, same as any later change. Without this
  // flag, `#applyModelValue` couldn't tell "the app set modelValue=false
  // before ever calling show()" apart from a real change, and would fire
  // show/hide lifecycle events for a drawer nobody actually opened or closed.
  #hasCompletedFirstUpdate = false

  override connectedCallback(): void {
    super.connectedCallback()
    // On `document`, not `this` — Escape should close an open overlay
    // drawer regardless of where focus currently is on the page, not just
    // when focus happens to be inside the drawer itself.
    document.addEventListener('keydown', this.#handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#mediaQuery?.removeEventListener('change', this.#handleBreakpointChange)
    document.removeEventListener('keydown', this.#handleKeydown)
  }

  override willUpdate(): void {
    // `showIfAbove` only forces initial visibility ("on initial render" per
    // Quasar's own docs) — deriving `modelValue` here, in `willUpdate`
    // (before render), folds into this same update cycle instead of
    // scheduling a new one, unlike mutating it from `updated()`.
    if (
      !this.#hasCompletedFirstUpdate &&
      this.showIfAbove &&
      !this.modelValue &&
      !this.#computeIsMobileMode()
    ) {
      this.modelValue = true
    }
  }

  #computeIsMobileMode(): boolean {
    if (this.behavior === 'desktop') return false
    if (this.behavior === 'mobile') return true
    return window.matchMedia(this.#breakpointMediaQueryString()).matches
  }

  // Shared by #computeIsMobileMode (a one-shot check, used by willUpdate's
  // showIfAbove logic, which runs before #setupBreakpointWatcher's own copy
  // below on the same first update) and #setupBreakpointWatcher (which
  // additionally sets up a persistent 'change' listener) — one source of
  // truth for the query string itself, even though the two call sites do
  // genuinely different things with the result.
  #breakpointMediaQueryString(): string {
    return `(max-width: ${String(this.breakpoint)}px)`
  }

  override updated(changed: Map<string, unknown>): void {
    const isFirstUpdate = !this.#hasCompletedFirstUpdate
    this.#hasCompletedFirstUpdate = true

    if (changed.has('modelValue')) this.#applyModelValue({ initial: isFirstUpdate })
    if (changed.has('width') || changed.has('mini') || changed.has('miniWidth')) {
      this.#syncWidthVar()
    }
    if (changed.has('breakpoint') || changed.has('behavior')) {
      this.#setupBreakpointWatcher()
    }
    if (
      changed.has('overlay') ||
      changed.has('mini') ||
      changed.has('miniToOverlay') ||
      changed.has('viewFixed')
    ) {
      this.#syncFixedAndNotifyLayout()
    }
    if (changed.has('noMiniAnimation')) {
      this.toggleAttribute('data-cdmt-no-mini-animation', this.noMiniAnimation)
    }
  }

  #syncWidthVar(): void {
    this.style.width = `${String(this.mini ? this.miniWidth : this.width)}px`
  }

  /**
   * Whether this drawer currently reserves space in `<cdmt-page-container>`
   * (docked, pushing content) rather than floating over it (overlay/mobile/
   * mini-to-overlay) — read externally by `<cdmt-layout>`, which can't see
   * this component's private mode state otherwise.
   *
   * @public
   */
  get isDocked(): boolean {
    return !(this.#isMobileMode || this.overlay || (this.mini && this.miniToOverlay))
  }

  #syncFixedAndNotifyLayout(): void {
    this.toggleAttribute('data-cdmt-fixed', this.#isFixed)
    // Bubbles up to <cdmt-layout>, which can't otherwise know this
    // component's mode/visibility changed without its own size changing.
    this.dispatchEvent(new CustomEvent('cdmt-layout-child-change', { bubbles: true }))
  }

  #setupBreakpointWatcher(): void {
    this.#mediaQuery?.removeEventListener('change', this.#handleBreakpointChange)

    if (this.behavior === 'desktop') {
      this.#isMobileMode = false
      this.#syncFixedAndNotifyLayout()
      return
    }
    if (this.behavior === 'mobile') {
      this.#isMobileMode = true
      this.#syncFixedAndNotifyLayout()
      return
    }

    this.#mediaQuery = window.matchMedia(this.#breakpointMediaQueryString())
    this.#isMobileMode = this.#mediaQuery.matches
    this.#mediaQuery.addEventListener('change', this.#handleBreakpointChange)
    this.#syncFixedAndNotifyLayout()
  }

  #handleBreakpointChange = (event: MediaQueryListEvent): void => {
    this.#isMobileMode = event.matches
    this.#syncFixedAndNotifyLayout()
    this.requestUpdate()
  }

  get #isFixed(): boolean {
    return this.#isMobileMode || this.overlay || (this.mini && this.miniToOverlay) || this.viewFixed
  }

  get #isBackdropVisible(): boolean {
    return this.modelValue && this.#isFixed
  }

  #applyModelValue({ initial }: { initial: boolean }): void {
    if (initial) {
      this.toggleAttribute('hidden', !this.modelValue)
      this.#syncFixedAndNotifyLayout()
      return
    }

    this.dispatchEvent(new CustomEvent(this.modelValue ? 'cdmt-before-show' : 'cdmt-before-hide'))

    this.toggleAttribute('hidden', !this.modelValue)
    this.#syncFixedAndNotifyLayout()

    this.dispatchEvent(new CustomEvent('cdmt-model-value-change', { detail: this.modelValue }))
    this.dispatchEvent(new CustomEvent(this.modelValue ? 'cdmt-show' : 'cdmt-hide'))
  }

  #handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.modelValue && !this.persistent) {
      this.hide()
    }
  }

  // Bound directly to the backdrop element in render() below — a
  // document-level "click outside" listener doesn't work here, since a
  // click on the backdrop (itself inside this component's shadow root)
  // gets retargeted to `this` before a document-level listener ever sees
  // it, making "did the click land inside `this`" always true.
  #handleBackdropClick = (): void => {
    if (this.persistent) return
    this.hide()
  }

  /** @public */
  show(): void {
    this.modelValue = true
  }

  /** @public */
  hide(): void {
    this.modelValue = false
  }

  /** @public */
  toggle(): void {
    this.modelValue = !this.modelValue
  }

  override render() {
    return html`
      <div
        class="cdmt-drawer__backdrop ${this.#isBackdropVisible ? 'cdmt-drawer__backdrop--visible' : ''}"
        @click=${this.#handleBackdropClick}
      ></div>
      <div class="cdmt-drawer__default-slot"><slot></slot></div>
      <div class="cdmt-drawer__mini-slot"><slot name="mini"></slot></div>
    `
  }
}

customElements.define('cdmt-drawer', CdmtDrawer)

declare global {
  interface HTMLElementTagNameMap {
    'cdmt-drawer': CdmtDrawer
  }
}
