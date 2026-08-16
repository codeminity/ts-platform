import { LitElement, html } from 'lit'

import { inputStyles } from './input.styles.js'

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

  static override styles = inputStyles

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
