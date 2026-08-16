import { LitElement, html } from 'lit'

import { pageContainerStyles } from './page-container.styles'

/**
 * `<cdmt-page-container>` — wraps a `<cdmt-page>` (directly, or through
 * client-side routing) inside `<cdmt-layout>`. Offsets its content from
 * whichever header/footer/drawers are actually present and fixed, via plain
 * CSS `var()` on the offsets `<cdmt-layout>` computes — reactive to
 * resizing/showing/hiding with no JS needed here.
 *
 * Deliberately no `transition` on padding — see DECISIONS.md#adr-006: a
 * `transition` on a property that also derives its value from an inherited
 * `var()` token permanently freezes it at its first-computed value in
 * Chromium (confirmed directly: the padding never re-samples the offset
 * after the very first paint, verified in a real browser). Padding updates
 * snap instantly instead, matching every other var()-derived property in
 * this package.
 *
 * @public
 */
export class CdmtPageContainer extends LitElement {
  static override styles = [pageContainerStyles]

  override render() {
    return html`<slot></slot>`
  }
}

customElements.define('cdmt-page-container', CdmtPageContainer)

declare global {
  interface HTMLElementTagNameMap {
    'cdmt-page-container': CdmtPageContainer
  }
}
