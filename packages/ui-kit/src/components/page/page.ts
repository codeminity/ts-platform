import { LitElement, css, html } from 'lit'

import { themeVar } from '../../theme/css-var.js'

/**
 * Computes the page's own inline style from the layout offset it inherits
 * (`heightOffset`: combined fixed header + fixed footer height, in px).
 * Overrides the default `min-height: calc(100vh - <offset>)` behavior.
 *
 * @public
 */
export type CdmtPageStyleFn = (heightOffset: number) => Record<string, string>

/**
 * `<cdmt-page>` — the main content area inside a `<cdmt-page-container>`.
 * Fills the remaining viewport height by default, reading
 * `--cdmt-layout-header-height`/`--cdmt-layout-footer-height` (set by the
 * nearest `<cdmt-layout>`) via plain CSS `var()` — reactive to header/footer
 * resizing with no JS observation needed. `styleFn`, when set, computes a
 * one-off inline style instead (from whatever the offset is at that moment)
 * — an escape hatch for custom layouts, not continuously reactive.
 *
 * @public
 */
export class CdmtPage extends LitElement {
  static override properties = {
    padding: { type: Boolean, reflect: true },
    styleFn: { attribute: false }
  }

  static override styles = css`
    :host {
      display: block;
      box-sizing: border-box;
      min-height: calc(
        100vh - var(--cdmt-layout-header-height, 0px) - var(--cdmt-layout-footer-height, 0px)
      );
    }

    :host([padding]) {
      padding: ${themeVar('spacingLg')};
    }
  `

  declare padding: boolean
  declare styleFn: CdmtPageStyleFn | undefined

  constructor() {
    super()
    this.padding = false
  }

  override updated(changed: Map<string, unknown>): void {
    if (!changed.has('styleFn')) return
    this.#applyStyleFn()
  }

  #applyStyleFn(): void {
    if (!this.styleFn) {
      this.style.removeProperty('min-height')
      return
    }

    const computedStyles = getComputedStyle(this)
    const headerHeight = Number.parseFloat(
      computedStyles.getPropertyValue('--cdmt-layout-header-height')
    )
    const footerHeight = Number.parseFloat(
      computedStyles.getPropertyValue('--cdmt-layout-footer-height')
    )
    const offset =
      (Number.isNaN(headerHeight) ? 0 : headerHeight) +
      (Number.isNaN(footerHeight) ? 0 : footerHeight)

    for (const [property, value] of Object.entries(this.styleFn(offset))) {
      this.style.setProperty(
        property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
        value
      )
    }
  }

  override render() {
    return html`<slot></slot>`
  }
}

customElements.define('cdmt-page', CdmtPage)

declare global {
  interface HTMLElementTagNameMap {
    'cdmt-page': CdmtPage
  }
}
