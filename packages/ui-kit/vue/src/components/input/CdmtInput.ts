import { defineComponent, h } from 'vue'

import type { CdmtInput as CdmtInputElement, CdmtInputType } from '@codeminity/ui-kit-core'

import type { PropType } from 'vue'

/**
 * A Vue wrapper around `<cdmt-input>` with real `v-model` support — bind
 * `v-model="value"` and it just works, the same as any native Vue form
 * component.
 *
 * Deliberately a plain `defineComponent` with a render function, not a
 * `.vue` SFC — see `DECISIONS.md#adr-001`.
 *
 * @public
 */
export const CdmtInput = defineComponent({
  name: 'CdmtInput',

  props: {
    modelValue: {
      type: String,
      default: ''
    },
    type: {
      type: String as PropType<CdmtInputType>,
      default: 'text'
    },
    placeholder: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    invalid: {
      type: Boolean,
      default: false
    }
  },

  emits: ['update:modelValue'],

  setup(props, { emit }) {
    // `cdmt-input`'s own `value` is a controlled property kept in sync by
    // its internal input handler, and it fires the native `input` event
    // (composed: true by spec) rather than a custom one — see
    // ui-kit-core's DECISIONS.md#adr-007. That's the whole reason this
    // wrapper needs no logic beyond this one-line translation.
    function handleInput(event: Event): void {
      emit('update:modelValue', (event.target as CdmtInputElement).value)
    }

    return () =>
      h('cdmt-input', {
        value: props.modelValue,
        type: props.type,
        placeholder: props.placeholder,
        disabled: props.disabled,
        invalid: props.invalid,
        onInput: handleInput
      })
  }
})
