import { LitElement, html } from 'lit'

import { itemStyles } from './item.styles.js'

/**
 * `<cdmt-item>` — one row inside a `<cdmt-list>`, typically containing one
 * or more `<cdmt-item-section>`s. `clickable` makes it interactive
 * (hover/focus states, keyboard-activatable via Enter/Space, `role="button"`
 * and a tab stop unless `manual-focus` is set); `disable` removes it from
 * interaction and the tab order entirely, taking priority over `clickable`.
 * `active` highlights it (e.g. the current page in a nav list). `inset-level`
 * indents it proportionally, for nested lists. `manual-focus` hands control
 * of the focus-ring visual to the `focused` prop instead of native
 * `:focus-visible` — for a parent that manages keyboard navigation itself
 * (e.g. arrow-key roving focus across a list) rather than relying on the
 * browser's own tab order.
 *
 * @public
 */
export class CdmtItem extends LitElement {
  static override properties = {
    disable: { type: Boolean, reflect: true },
    active: { type: Boolean, reflect: true },
    clickable: { type: Boolean, reflect: true },
    dense: { type: Boolean, reflect: true },
    insetLevel: { type: Number, attribute: 'inset-level' },
    manualFocus: { type: Boolean, attribute: 'manual-focus' },
    focused: { type: Boolean, reflect: true }
  }

  static override styles = itemStyles

  declare disable: boolean
  declare active: boolean
  declare clickable: boolean
  declare dense: boolean
  declare insetLevel: number
  declare manualFocus: boolean
  declare focused: boolean

  constructor() {
    super()
    this.disable = false
    this.active = false
    this.clickable = false
    this.dense = false
    this.insetLevel = 0
    this.manualFocus = false
    this.focused = false
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('keydown', this.#handleKeydown)
  }

  override disconnectedCallback(): void {
    // Stryker disable next-line CallExpression: equivalent mutant — see
    // drawer.ts's identical disconnectedCallback comment: no component here
    // registers a Lit ReactiveController, so this has no observable effect.
    super.disconnectedCallback()
    this.removeEventListener('keydown', this.#handleKeydown)
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('insetLevel')) {
      if (this.insetLevel > 0) {
        this.style.setProperty('--cdmt-item-inset', String(this.insetLevel))
      } else {
        this.style.removeProperty('--cdmt-item-inset')
      }
    }

    if (changed.has('clickable') || changed.has('disable') || changed.has('manualFocus')) {
      this.#syncInteractivity()
    }
  }

  #syncInteractivity(): void {
    if (this.clickable && !this.disable) {
      this.setAttribute('role', 'button')
      if (this.manualFocus) {
        this.removeAttribute('tabindex')
      } else {
        this.setAttribute('tabindex', '0')
      }
    } else {
      this.removeAttribute('role')
      this.removeAttribute('tabindex')
    }
  }

  #handleKeydown = (event: KeyboardEvent): void => {
    if (!this.clickable || this.disable) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    this.click()
  }

  override render() {
    return html`<slot></slot>`
  }
}

customElements.define('cdmt-item', CdmtItem)

declare global {
  interface HTMLElementTagNameMap {
    'cdmt-item': CdmtItem
  }
}
