import { defineComponent, h } from 'vue'

import type {
  CdmtInput as CdmtInputElement,
  CdmtInputType
} from '../../../components/input/input.js'
import type { PropType } from 'vue'

/**
 * Vue wrapper for `<cdmt-input>` — real `v-model` support: translates the
 * native (already-composed) `input` event into `update:modelValue`. No
 * other logic lives here; `value` stays a controlled property on the
 * underlying `@codeminity/ui-kit` `CdmtInput` Lit component.
 *
 * @public
 */
export const CdmtInput = defineComponent({
  name: 'CdmtInput',
  props: {
    modelValue: { type: String, default: '' },
    type: { type: String as PropType<CdmtInputType>, default: 'text' },
    placeholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    invalid: { type: Boolean, default: false }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
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
