import { defineComponent, h } from 'vue'

/**
 * Vue wrapper for `<cdmt-list>` — a thin translation layer only, all real
 * behavior lives in `@codeminity/ui-kit`'s `CdmtList` Lit component.
 *
 * @public
 */
export const CdmtList = defineComponent({
  name: 'CdmtList',
  props: {
    bordered: { type: Boolean, default: false },
    dense: { type: Boolean, default: false },
    separator: { type: Boolean, default: false },
    padding: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    return () =>
      h(
        'cdmt-list',
        {
          bordered: props.bordered,
          dense: props.dense,
          separator: props.separator,
          padding: props.padding
        },
        slots.default?.()
      )
  }
})
