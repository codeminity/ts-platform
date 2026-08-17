import { defineComponent, h } from 'vue'

/**
 * Vue wrapper for `<cdmt-item-section>` — a thin translation layer only,
 * all real behavior lives in `@codeminity/ui-kit`'s `CdmtItemSection` Lit
 * component.
 *
 * @public
 */
export const CdmtItemSection = defineComponent({
  name: 'CdmtItemSection',
  props: {
    avatar: { type: Boolean, default: false },
    thumbnail: { type: Boolean, default: false },
    side: { type: Boolean, default: false },
    top: { type: Boolean, default: false },
    noWrap: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    return () =>
      h(
        'cdmt-item-section',
        {
          avatar: props.avatar,
          thumbnail: props.thumbnail,
          side: props.side,
          top: props.top,
          noWrap: props.noWrap
        },
        slots.default?.()
      )
  }
})
