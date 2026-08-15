import { LitElement, css, html } from 'lit'

import { themeVar } from '../../theme/css-var.js'

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

  // `transition` below is scoped to `opacity` only, deliberately not
  // `background-color` — a transition on the same property that also
  // derives its value from an inherited custom property permanently
  // freezes that property at its first-computed value in Chromium
  // (verified: applyTheme() re-resolves the underlying --cdmt-* custom
  // property correctly, but the transitioned property itself never
  // re-samples it). See DECISIONS.md#adr-006.
  static override styles = [
    css`
      :host {
        display: inline-block;
      }

      button {
        font-family: ${themeVar('fontFamily')};
        font-size: ${themeVar('fontSize')};
        font-weight: ${themeVar('fontWeightNormal')};
        cursor: pointer;
        border-radius: ${themeVar('radiusMd')};
        padding: ${themeVar('spacingSm')} ${themeVar('spacingXl')};
        border: ${themeVar('borderWidth')} solid transparent;
        transition: opacity ${themeVar('transitionDuration')} ${themeVar('transitionEasing')};
      }

      button:disabled {
        cursor: not-allowed;
        opacity: ${themeVar('opacityDisabled')};
      }

      button:focus-visible {
        outline: none;
        box-shadow: 0 0 0 ${themeVar('focusRingWidth')} ${themeVar('focusRingColor')};
      }

      :host([variant='primary']) button {
        background: ${themeVar('colorPrimary')};
        color: ${themeVar('colorPrimaryForeground')};
      }

      :host([variant='primary']) button:hover:not(:disabled) {
        background: ${themeVar('colorPrimaryHover')};
      }

      :host([variant='secondary']) button {
        background: ${themeVar('colorSecondary')};
        color: ${themeVar('colorSecondaryForeground')};
      }

      :host([variant='secondary']) button:hover:not(:disabled) {
        background: ${themeVar('colorSecondaryHover')};
      }

      :host([variant='ghost']) button {
        background: transparent;
        color: ${themeVar('colorPrimary')};
        border-color: ${themeVar('colorPrimary')};
      }

      :host([variant='ghost']) button:hover:not(:disabled) {
        background: ${themeVar('colorSurfaceHover')};
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
