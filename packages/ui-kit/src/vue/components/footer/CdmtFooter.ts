import { defineComponent, h } from 'vue'

/**
 * Vue wrapper for `<cdmt-footer>` — a thin translation layer only, all real
 * behavior lives in `@codeminity/ui-kit`'s `CdmtFooter` Lit component. See
 * `CdmtHeader`'s doc comment for why `modelValue` is one-way here.
 *
 * @public
 */
export const CdmtFooter = defineComponent({
  name: 'CdmtFooter',
  props: {
    modelValue: { type: Boolean, default: true },
    reveal: { type: Boolean, default: false },
    bordered: { type: Boolean, default: false },
    elevated: { type: Boolean, default: false },
    heightHint: { type: Number, default: 50 }
  },
  emits: ['reveal'],
  setup(props, { slots, emit }) {
    function handleReveal(event: Event): void {
      emit('reveal', (event as CustomEvent<boolean>).detail)
    }

    return () =>
      h(
        'cdmt-footer',
        {
          modelValue: props.modelValue,
          reveal: props.reveal,
          bordered: props.bordered,
          elevated: props.elevated,
          heightHint: props.heightHint,
          onCdmtReveal: handleReveal
        },
        slots.default?.()
      )
  }
})
