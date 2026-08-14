import { defineComponent, h } from 'vue'

import type { CdmtButtonVariant } from '@codeminity/ui-kit-core'

import type { PropType } from 'vue'

/**
 * A Vue wrapper around `<cdmt-button>`. No `v-model` needed here — this is
 * typed prop pass-through plus slot forwarding; `@click` and every other
 * native event work on the rendered element with no translation, exactly
 * like they would on the raw custom element.
 *
 * @public
 */
export const CdmtButton = defineComponent({
  name: 'CdmtButton',

  props: {
    variant: {
      type: String as PropType<CdmtButtonVariant>,
      default: 'primary'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },

  setup(props, { slots }) {
    return () =>
      h(
        'cdmt-button',
        {
          variant: props.variant,
          disabled: props.disabled
        },
        slots.default?.()
      )
  }
})
