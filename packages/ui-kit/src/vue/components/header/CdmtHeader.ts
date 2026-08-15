import { defineComponent, h } from 'vue'

/**
 * Vue wrapper for `<cdmt-header>` — a thin translation layer only, all real
 * behavior lives in `@codeminity/ui-kit`'s `CdmtHeader` Lit component.
 * `modelValue` is a one-way controlled prop here: nothing inside the header
 * itself changes visibility (unlike `CdmtDrawer`), so there's no internal
 * source of truth to emit `update:modelValue` from.
 *
 * @public
 */
export const CdmtHeader = defineComponent({
  name: 'CdmtHeader',
  props: {
    modelValue: { type: Boolean, default: true },
    reveal: { type: Boolean, default: false },
    revealOffset: { type: Number, default: 250 },
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
        'cdmt-header',
        {
          modelValue: props.modelValue,
          reveal: props.reveal,
          revealOffset: props.revealOffset,
          bordered: props.bordered,
          elevated: props.elevated,
          heightHint: props.heightHint,
          onCdmtReveal: handleReveal
        },
        slots.default?.()
      )
  }
})
