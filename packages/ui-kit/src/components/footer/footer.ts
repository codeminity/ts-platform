import { LitElement, html } from 'lit'

import { footerStyles } from './footer.styles.js'

/**
 * `<cdmt-footer>` — a footer row inside `<cdmt-layout>`. Same fixed/reveal
 * mechanics as `<cdmt-header>` (see its doc comment), mirrored to the bottom
 * edge. Unlike the header, `reveal` here has no offset threshold — it
 * reacts to scroll direction immediately, matching Quasar's own QFooter API
 * (no `reveal-offset` prop there).
 *
 * @public
 */
export class CdmtFooter extends LitElement {
  static override properties = {
    modelValue: { type: Boolean, attribute: 'model-value' },
    reveal: { type: Boolean },
    bordered: { type: Boolean, reflect: true },
    elevated: { type: Boolean, reflect: true },
    heightHint: { type: Number, attribute: 'height-hint' }
  }

  static override styles = [footerStyles]

  declare modelValue: boolean
  declare reveal: boolean
  declare bordered: boolean
  declare elevated: boolean
  declare heightHint: number

  #lastScrollPosition = 0

  constructor() {
    super()
    this.modelValue = true
    this.reveal = false
    this.bordered = false
    this.elevated = false
    this.heightHint = 50
  }

  // No connectedCallback override — see header.ts's identical note: `updated()`
  // below already handles the very first render correctly, so a separate
  // sync-at-connect copy of this same logic would only be redundant.

  override disconnectedCallback(): void {
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

    if (delta > 0) {
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

customElements.define('cdmt-footer', CdmtFooter)

declare global {
  interface HTMLElementTagNameMap {
    'cdmt-footer': CdmtFooter
  }
}
