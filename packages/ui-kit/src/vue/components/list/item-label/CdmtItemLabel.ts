import { defineComponent, h } from 'vue'

/**
 * Vue wrapper for `<cdmt-item-label>` — a thin translation layer only, all
 * real behavior lives in `@codeminity/ui-kit`'s `CdmtItemLabel` Lit
 * component.
 *
 * @public
 */
export const CdmtItemLabel = defineComponent({
  name: 'CdmtItemLabel',
  props: {
    overline: { type: Boolean, default: false },
    caption: { type: Boolean, default: false },
    header: { type: Boolean, default: false },
    lines: { type: Number, default: 0 }
  },
  setup(props, { slots }) {
    return () =>
      h(
        'cdmt-item-label',
        {
          overline: props.overline,
          caption: props.caption,
          header: props.header,
          lines: props.lines
        },
        slots.default?.()
      )
  }
})
