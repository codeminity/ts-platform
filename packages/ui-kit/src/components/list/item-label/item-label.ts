import { LitElement, html } from 'lit'

import { itemLabelStyles } from './item-label.styles.js'

/**
 * `<cdmt-item-label>` — one line of text inside a `<cdmt-item-section>`.
 * Plain (no flags) renders as the main line; `header` renders larger and
 * bolder for a leading title; `overline` renders small, uppercase, and
 * muted for a label above the main line; `caption` renders small and muted
 * for a secondary line below it. `lines` clamps overflowing text to that
 * many lines with an ellipsis instead of letting it wrap indefinitely —
 * unset (`0`) never clamps.
 *
 * @public
 */
export class CdmtItemLabel extends LitElement {
  static override properties = {
    overline: { type: Boolean, reflect: true },
    caption: { type: Boolean, reflect: true },
    header: { type: Boolean, reflect: true },
    lines: { type: Number }
  }

  static override styles = itemLabelStyles

  declare overline: boolean
  declare caption: boolean
  declare header: boolean
  declare lines: number

  constructor() {
    super()
    this.overline = false
    this.caption = false
    this.header = false
    this.lines = 0
  }

  // `-webkit-line-clamp` needs its own `display`/`overflow` set together
  // with it to take effect at all, and only makes sense as an inline style
  // (the clamp count is a per-instance number, not a themeable value) — set
  // directly here rather than in the static styles, matching this
  // package's own established pattern for other per-instance-computed
  // values (e.g. <cdmt-drawer>'s width).
  override updated(changed: Map<string, unknown>): void {
    if (!changed.has('lines')) return

    if (this.lines > 0) {
      // `setProperty` (not the `.display`/`.overflow` accessors): the
      // legacy `-webkit-box` value isn't in the standard `display` keyword
      // set the CSSOM property setter validates against, and gets silently
      // rejected there — confirmed directly (assigning it and reading it
      // back returned an empty string).
      this.style.setProperty('display', '-webkit-box')
      this.style.setProperty('overflow', 'hidden')
      this.style.setProperty('-webkit-line-clamp', String(this.lines))
      this.style.setProperty('-webkit-box-orient', 'vertical')
    } else {
      this.style.removeProperty('display')
      this.style.removeProperty('overflow')
      this.style.removeProperty('-webkit-line-clamp')
      this.style.removeProperty('-webkit-box-orient')
    }
  }

  override render() {
    return html`<slot></slot>`
  }
}

customElements.define('cdmt-item-label', CdmtItemLabel)

declare global {
  interface HTMLElementTagNameMap {
    'cdmt-item-label': CdmtItemLabel
  }
}
