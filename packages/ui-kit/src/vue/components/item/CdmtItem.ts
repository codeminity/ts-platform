import { defineComponent, h } from 'vue'

/**
 * Vue wrapper for `<cdmt-item>` — a thin translation layer only, all real
 * behavior lives in `@codeminity/ui-kit`'s `CdmtItem` Lit component.
 *
 * @public
 */
export const CdmtItem = defineComponent({
  name: 'CdmtItem',
  props: {
    disable: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    clickable: { type: Boolean, default: false },
    dense: { type: Boolean, default: false },
    insetLevel: { type: Number, default: 0 },
    manualFocus: { type: Boolean, default: false },
    focused: { type: Boolean, default: false }
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () =>
      h(
        'cdmt-item',
        {
          disable: props.disable,
          active: props.active,
          clickable: props.clickable,
          dense: props.dense,
          insetLevel: props.insetLevel,
          manualFocus: props.manualFocus,
          focused: props.focused,
          onClick: (event: MouseEvent) => {
            emit('click', event)
          }
        },
        slots.default?.()
      )
  }
})
