import { LitElement, css, html } from 'lit'

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
  static override styles = css`
    :host {
      display: block;
      padding-top: var(--cdmt-layout-header-height, 0px);
      padding-bottom: var(--cdmt-layout-footer-height, 0px);
      padding-left: var(--cdmt-layout-drawer-left-width, 0px);
      padding-right: var(--cdmt-layout-drawer-right-width, 0px);
    }
  `

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
