import { LitElement, html } from 'lit'

import { buttonStyles } from './button.styles.js'

/**
 * The visual style of a {@link CdmtButton}.
 *
 * @public
 */
export type CdmtButtonVariant = 'primary' | 'secondary' | 'ghost'

/**
 * `<cdmt-button>` — a plain Custom Element button with `primary`/`secondary`/
 * `ghost` variants and a `disabled` state. No Vue, React, or Angular
 * dependency.
 *
 * @public
 */
// Plain `static properties` (no decorators) — deliberate choice, not a
// fallback. Standard TC39 decorators aren't lowered by Oxc yet (Vite 8's
// default transformer; tracked at oxc#9170, no timeline), and legacy
// `experimentalDecorators` is the TS-only mechanism TypeScript itself is
// moving away from. `static properties` depends on neither and is Lit's
// own fully-supported, permanent alternative.
export class CdmtButton extends LitElement {
  static override properties = {
    variant: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true }
  }

  static override styles = [buttonStyles]

  // `declare` (no initializer): Lit installs a reactive getter/setter for
  // each entry in `properties` on the prototype at class-definition time.
  // A real field initializer here would create an own-property on the
  // instance that shadows that accessor, breaking reactivity — `declare`
  // tells TypeScript the field exists without emitting one.
  declare variant: CdmtButtonVariant
  declare disabled: boolean

  constructor() {
    super()
    this.variant = 'primary'
    this.disabled = false
  }

  override render() {
    return html`
      <button type="button" ?disabled=${this.disabled}>
        <slot></slot>
      </button>
    `
  }
}

customElements.define('cdmt-button', CdmtButton)

declare global {
  interface HTMLElementTagNameMap {
    'cdmt-button': CdmtButton
  }
}
