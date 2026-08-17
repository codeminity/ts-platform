import { LitElement, html } from 'lit'

import { listStyles } from './list.styles.js'

/**
 * `<cdmt-list>` — a vertical container for `<cdmt-item>`s. `bordered` draws
 * a border around the whole list; `padding` adds vertical padding inside it;
 * `separator` draws a divider line between consecutive items; `dense`
 * shrinks every contained `<cdmt-item>`'s own padding via an inherited CSS
 * custom property, without either component needing to know about the
 * other directly.
 *
 * @public
 */
export class CdmtList extends LitElement {
  static override properties = {
    bordered: { type: Boolean, reflect: true },
    dense: { type: Boolean, reflect: true },
    separator: { type: Boolean, reflect: true },
    padding: { type: Boolean, reflect: true }
  }

  static override styles = listStyles

  declare bordered: boolean
  declare dense: boolean
  declare separator: boolean
  declare padding: boolean

  constructor() {
    super()
    this.bordered = false
    this.dense = false
    this.separator = false
    this.padding = false
  }

  override render() {
    return html`<slot></slot>`
  }
}

customElements.define('cdmt-list', CdmtList)

declare global {
  interface HTMLElementTagNameMap {
    'cdmt-list': CdmtList
  }
}
