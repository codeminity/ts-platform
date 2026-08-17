import { LitElement, html } from 'lit'

import { drawerStyles } from './drawer.styles.js'

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

  static override styles = drawerStyles

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

  // Transitions start disabled (see the base :host rule above) and are only
  // turned on after two nested rAFs — the first fires *before* the browser's
  // next paint, so code in it still runs pre-paint; only the nested one is
  // guaranteed to run after a real paint has happened (same double-rAF
  // pattern ui-kit-docs's own main.ts already uses for an equivalent
  // problem). Confirmed directly: calling show()/hide() within roughly the
  // first two toggles after connecting — e.g. right after page load, before
  // the browser had painted a real frame to transition *from* — made the
  // transform jump straight to its end value instead of animating; with
  // transitions gated behind an actual painted frame, every toggle animates.
  override firstUpdated(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.setAttribute('data-cdmt-transitions-enabled', '')
      })
    })
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
    if (changed.has('breakpoint') || changed.has('behavior')) {
      this.#setupBreakpointWatcher()
    }
    if (
      changed.has('width') ||
      changed.has('mini') ||
      changed.has('miniWidth') ||
      changed.has('overlay') ||
      changed.has('miniToOverlay') ||
      changed.has('viewFixed')
    ) {
      this.#syncFixedAndNotifyLayout()
    }
    if (changed.has('noMiniAnimation')) {
      this.toggleAttribute('data-cdmt-no-mini-animation', this.noMiniAnimation)
    }
  }

  // A docked (non-fixed) drawer is still in normal flow, so unlike a fixed/
  // overlay one (which only needs to visually slide away), it needs to
  // actually collapse to 0 while hidden — otherwise it keeps reserving its
  // full width in <cdmt-layout>'s flex row and adjacent page content never
  // reflows into the freed space.
  #syncWidthVar(): void {
    const openWidth = this.mini ? this.miniWidth : this.width
    const collapsed = !this.#isFixed && !this.modelValue
    this.style.width = `${String(collapsed ? 0 : openWidth)}px`
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
    // A docked<->fixed mode switch (e.g. resizing across the breakpoint)
    // while already closed shouldn't visibly animate at all — both states
    // are "invisible," just via a different mechanism (0 width vs. an
    // off-screen transform), so transitioning between them flashes the
    // drawer's own panel open-then-shut for no real reason. Suppressing the
    // transition, forcing the change to commit via a synchronous layout
    // read, then restoring it, makes this one switch instant without
    // affecting any later, genuinely user-driven show/hide.
    const modeSwitchWhileClosed =
      this.hasAttribute('data-cdmt-fixed') !== this.#isFixed && !this.modelValue
    if (modeSwitchWhileClosed) this.style.transition = 'none'

    this.toggleAttribute('data-cdmt-fixed', this.#isFixed)
    this.toggleAttribute('data-cdmt-overlay-fixed', this.#isFixed && !this.isDocked)
    // Folded in here rather than tracked separately — every call site below
    // (mode/breakpoint changes, model-value changes via #applyModelValue)
    // is exactly when the docked/fixed-vs-collapsed width might also need
    // recomputing, so one shared trigger point avoids the two ever drifting
    // out of sync with each other.
    this.#syncWidthVar()

    if (modeSwitchWhileClosed) {
      void this.offsetWidth
      this.style.transition = ''
    }

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

  // Same `#isFixed && !isDocked` distinction `data-cdmt-overlay-fixed`
  // already uses, and for the same reason: `#isFixed` alone is also true
  // for a *docked*-and-fixed drawer (a permanent desktop sidebar, via
  // `view-fixed` from <cdmt-layout>'s `view` string) — not just a genuine
  // temporary overlay. Missing `!isDocked` here left a docked-fixed
  // drawer's backdrop invisibly "visible" (opacity 0, but still
  // `pointer-events: auto`, `position: fixed; inset: 0`) for as long as
  // the drawer stayed open — which, being permanently docked, is forever —
  // silently blocking every click on the rest of the page. Confirmed
  // directly via `document.elementFromPoint`/`shadowRoot.elementFromPoint`
  // after setting a fixed-docked `view`.
  get #isBackdropVisible(): boolean {
    return this.modelValue && this.#isFixed && !this.isDocked
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
      <div class="cdmt-drawer__panel">
        <div class="cdmt-drawer__default-slot"><slot></slot></div>
        <div class="cdmt-drawer__mini-slot"><slot name="mini"></slot></div>
      </div>
    `
  }
}

customElements.define('cdmt-drawer', CdmtDrawer)

declare global {
  interface HTMLElementTagNameMap {
    'cdmt-drawer': CdmtDrawer
  }
}
