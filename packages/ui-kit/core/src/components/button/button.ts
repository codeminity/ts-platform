import { LitElement, css, html } from 'lit'

import { tokens } from '../../theme/tokens.js'

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

  static override styles = [
    tokens,
    css`
      :host {
        display: inline-block;
      }

      button {
        font-family: var(--cdmt-font-family);
        font-size: var(--cdmt-font-size);
        cursor: pointer;
        border-radius: var(--cdmt-radius-md);
        padding: 0.5em 1.25em;
        border: 1px solid transparent;
        transition:
          background-color var(--cdmt-transition-duration) var(--cdmt-transition-easing),
          opacity var(--cdmt-transition-duration) var(--cdmt-transition-easing);
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      :host([variant='primary']) button {
        background: var(--cdmt-color-primary);
        color: var(--cdmt-color-on-primary);
      }

      :host([variant='primary']) button:hover:not(:disabled) {
        background: var(--cdmt-color-primary-hover);
      }

      :host([variant='secondary']) button {
        background: var(--cdmt-color-secondary);
        color: var(--cdmt-color-on-secondary);
      }

      :host([variant='secondary']) button:hover:not(:disabled) {
        background: var(--cdmt-color-secondary-hover);
      }

      :host([variant='ghost']) button {
        background: transparent;
        color: var(--cdmt-color-primary);
        border-color: var(--cdmt-color-primary);
      }

      :host([variant='ghost']) button:hover:not(:disabled) {
        background: var(--cdmt-color-ghost-hover);
      }
    `
  ]

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
