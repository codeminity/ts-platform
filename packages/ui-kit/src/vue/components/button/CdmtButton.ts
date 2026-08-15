import { defineComponent, h } from 'vue'

import type { CdmtButtonVariant } from '../../../components/button/button.js'
import type { PropType } from 'vue'

/**
 * Vue wrapper for `<cdmt-button>` — a thin translation layer only, all real
 * behavior lives in `@codeminity/ui-kit`'s `CdmtButton` Lit component.
 *
 * @public
 */
export const CdmtButton = defineComponent({
  name: 'CdmtButton',
  props: {
    variant: { type: String as PropType<CdmtButtonVariant>, default: 'primary' },
    disabled: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    return () =>
      h('cdmt-button', { variant: props.variant, disabled: props.disabled }, slots.default?.())
  }
})
