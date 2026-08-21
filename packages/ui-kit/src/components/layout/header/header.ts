import { LitElement, html } from 'lit'

import { headerStyles } from './header.styles.js'

/**
 * `<cdmt-header>` — a header row inside `<cdmt-layout>`. Whether it renders
 * `position: fixed` is decided by the parent `<cdmt-layout>`'s `fixed-header`
 * attribute, which marks it via an internal `data-cdmt-fixed` attribute —
 * not a prop this component reads itself.
 *
 * `reveal` mode hides the header on scroll-down past `reveal-offset` and
 * brings it back on scroll-up, via a CSS transform — this deliberately
 * doesn't affect the height `<cdmt-layout>` measures, so the reserved space
 * stays put regardless of the transform.
 *
 * @public
 */
export class CdmtHeader extends LitElement {
  static override properties = {
    modelValue: { type: Boolean, attribute: 'model-value' },
    reveal: { type: Boolean },
    revealOffset: { type: Number, attribute: 'reveal-offset' },
    bordered: { type: Boolean, reflect: true },
    elevated: { type: Boolean, reflect: true },
    // No layout effect of our own (no SSR here) — `<cdmt-layout>` reads this
    // directly off the element as a synchronous fallback before its own
    // ResizeObserver delivers a first real measurement.
    heightHint: { type: Number, attribute: 'height-hint' }
  }

  static override styles = headerStyles

  declare modelValue: boolean
  declare reveal: boolean
  declare revealOffset: number
  declare bordered: boolean
  declare elevated: boolean
  declare heightHint: number

  #lastScrollPosition = 0

  constructor() {
    super()
    this.modelValue = true
    this.reveal = false
    this.revealOffset = 250
    this.bordered = false
    this.elevated = false
    this.heightHint = 50
  }

  // No connectedCallback override — `updated()` below already handles the
  // very first render correctly (a constructor-set reactive property counts
  // as "changed" on that first cycle too), so a separate sync-at-connect
  // copy of this same logic would only be redundant, unobservable code.

  override disconnectedCallback(): void {
    // Stryker disable next-line CallExpression: equivalent mutant — see
    // drawer.ts's identical disconnectedCallback comment: no component here
    // registers a Lit ReactiveController, so this has no observable effect.
    super.disconnectedCallback()
    window.removeEventListener('scroll', this.#handleScroll)
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('modelValue')) {
      this.toggleAttribute('hidden', !this.modelValue)
    }

    if (changed.has('reveal')) {
      window.removeEventListener('scroll', this.#handleScroll)
      if (this.reveal) {
        window.addEventListener('scroll', this.#handleScroll, { passive: true })
      } else {
        this.removeAttribute('data-cdmt-revealed')
      }
    }
  }

  #handleScroll = (): void => {
    const position = window.scrollY
    const delta = position - this.#lastScrollPosition
    this.#lastScrollPosition = position

    if (position < this.revealOffset) {
      this.#setRevealed(true)
    } else if (delta > 0) {
      this.#setRevealed(false)
    } else if (delta < 0) {
      this.#setRevealed(true)
    }
  }

  #setRevealed(revealed: boolean): void {
    const wasRevealed = this.getAttribute('data-cdmt-revealed') !== 'false'
    if (this.hasAttribute('data-cdmt-revealed') && wasRevealed === revealed) return

    this.setAttribute('data-cdmt-revealed', String(revealed))
    this.dispatchEvent(new CustomEvent('cdmt-reveal', { detail: revealed }))
  }

  override render() {
    return html`<slot></slot>`
  }
}

customElements.define('cdmt-header', CdmtHeader)

declare global {
  interface HTMLElementTagNameMap {
    'cdmt-header': CdmtHeader
  }
}
