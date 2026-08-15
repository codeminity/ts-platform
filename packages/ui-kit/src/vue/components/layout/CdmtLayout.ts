import { defineComponent, h } from 'vue'

/**
 * Vue wrapper for `<cdmt-layout>` — a thin translation layer only, all real
 * behavior lives in `@codeminity/ui-kit`'s `CdmtLayout` Lit component,
 * including auto-routing its header/footer/drawer/page-container children
 * by tag name — which works the same whether those children were authored
 * as plain HTML or via this package's own Vue wrappers, since it operates
 * on the real DOM, not Vue's component tree.
 *
 * @public
 */
export const CdmtLayout = defineComponent({
  name: 'CdmtLayout',
  props: {
    view: { type: String, default: 'hhh lpr fff' },
    container: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    return () =>
      h('cdmt-layout', { view: props.view, container: props.container }, slots.default?.())
  }
})
