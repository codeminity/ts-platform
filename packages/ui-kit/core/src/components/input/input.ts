import { LitElement, css, html } from 'lit'

import { themeVar } from '../../theme/css-var.js'

/**
 * The `type` attribute a {@link CdmtInput} passes through to its native
 * `<input>`.
 *
 * @public
 */
export type CdmtInputType = 'text' | 'email' | 'password'

/**
 * `<cdmt-input>` — a plain Custom Element text input wrapping a native
 * `<input>`. `value` is a controlled property: set it externally to update
 * the field, and it stays in sync as the user types, so a framework wrapper
 * (e.g. Vue's `v-model`) can bind to it directly. No Vue, React, or Angular
 * dependency.
 *
 * @public
 */
export class CdmtInput extends LitElement {
  static override properties = {
    value: { type: String },
    type: { type: String, reflect: true },
    placeholder: { type: String },
    disabled: { type: Boolean, reflect: true },
    invalid: { type: Boolean, reflect: true }
  }

  static override styles = css`
    :host {
      display: inline-block;
    }

    input {
      box-sizing: border-box;
      width: 100%;
      font-family: ${themeVar('fontFamily')};
      font-size: ${themeVar('fontSize')};
      color: ${themeVar('colorText')};
      background: ${themeVar('colorSurface')};
      padding: 0.5em 0.75em;
      border-radius: ${themeVar('radiusMd')};
      border: 1px solid ${themeVar('colorBorder')};
      transition: opacity ${themeVar('transitionDuration')} ${themeVar('transitionEasing')};
    }

    input:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    input:focus {
      outline: none;
      border-color: ${themeVar('colorPrimary')};
    }

    :host([invalid]) input {
      border-color: ${themeVar('colorDanger')};
    }
  `

  // `declare` (no initializer): Lit installs a reactive getter/setter for
  // each entry in `properties` on the prototype at class-definition time.
  // A real field initializer here would create an own-property on the
  // instance that shadows that accessor, breaking reactivity — `declare`
  // tells TypeScript the field exists without emitting one.
  declare value: string
  declare type: CdmtInputType
  declare placeholder: string
  declare disabled: boolean
  declare invalid: boolean

  constructor() {
    super()
    this.value = ''
    this.type = 'text'
    this.placeholder = ''
    this.disabled = false
    this.invalid = false
  }

  #handleInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value
  }

  override render() {
    return html`
      <input
        .value=${this.value}
        type=${this.type}
        placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        @input=${this.#handleInput}
      />
    `
  }
}

customElements.define('cdmt-input', CdmtInput)

declare global {
  interface HTMLElementTagNameMap {
    'cdmt-input': CdmtInput
  }
}
