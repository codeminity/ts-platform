import { defineComponent, h } from 'vue'

import type { CdmtPageStyleFn } from '../../../../components/layout/page/page.js'
import type { PropType } from 'vue'

/**
 * Vue wrapper for `<cdmt-page>` — a thin translation layer only, all real
 * behavior lives in `@codeminity/ui-kit`'s `CdmtPage` Lit component.
 *
 * @public
 */
export const CdmtPage = defineComponent({
  name: 'CdmtPage',
  props: {
    padding: { type: Boolean, default: false },
    styleFn: { type: Function as PropType<CdmtPageStyleFn>, default: undefined }
  },
  setup(props, { slots }) {
    return () =>
      h('cdmt-page', { padding: props.padding, styleFn: props.styleFn }, slots.default?.())
  }
})
