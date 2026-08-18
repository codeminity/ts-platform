import { LitElement, html } from 'lit'

import { itemSectionStyles } from './item-section.styles.js'

/**
 * `<cdmt-item-section>` — one column inside a `<cdmt-item>`. Plain (no
 * flags) grows to fill remaining space and stacks its content (e.g. a
 * `<cdmt-item-label>` pair) vertically, centered. `avatar`/`thumbnail` fix
 * the column to a small/medium width instead of growing, for a leading
 * image or icon; `side` fixes the width without imposing a size, for a
 * trailing icon or action; `top` aligns multi-line content to the top of
 * the row instead of centering it; `no-wrap` truncates overflowing text
 * with an ellipsis instead of wrapping.
 *
 * @public
 */
export class CdmtItemSection extends LitElement {
  static override properties = {
    avatar: { type: Boolean, reflect: true },
    thumbnail: { type: Boolean, reflect: true },
    side: { type: Boolean, reflect: true },
    top: { type: Boolean, reflect: true },
    noWrap: { type: Boolean, reflect: true, attribute: 'no-wrap' }
  }

  static override styles = itemSectionStyles

  declare avatar: boolean
  declare thumbnail: boolean
  declare side: boolean
  declare top: boolean
  declare noWrap: boolean

  constructor() {
    super()
    this.avatar = false
    this.thumbnail = false
    this.side = false
    this.top = false
    this.noWrap = false
  }

  override render() {
    return html`<slot></slot>`
  }
}

customElements.define('cdmt-item-section', CdmtItemSection)

declare global {
  interface HTMLElementTagNameMap {
    'cdmt-item-section': CdmtItemSection
  }
}
