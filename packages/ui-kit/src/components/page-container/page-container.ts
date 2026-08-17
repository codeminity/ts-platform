import { LitElement, html } from 'lit'

import { pageContainerStyles } from './page-container.styles.js'

/**
 * `<cdmt-page-container>` — wraps a `<cdmt-page>` (directly, or through
 * client-side routing) inside `<cdmt-layout>`. Offsets its content from
 * whichever header/footer/drawers are actually present and fixed, via plain
 * CSS `var()` on the offsets `<cdmt-layout>` computes — reactive to
 * resizing/showing/hiding with no JS needed here.
 *
 * Padding transitions alongside `<cdmt-layout>`'s header/footer/drawer
 * animations — safely, because `<cdmt-layout>` sets each padding value here
 * as a direct inline style, not through a `var()`. A `transition` on a
 * property that also derives its value from an inherited `var()` token
 * permanently freezes it at its first-computed value in Chromium (confirmed
 * directly while first building this component); setting the value as a
 * plain inline style instead — the same technique `<cdmt-drawer>` already
 * uses for its own width — sidesteps that entirely.
 *
 * @public
 */
export class CdmtPageContainer extends LitElement {
  static override styles = pageContainerStyles

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
