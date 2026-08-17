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
    fixedHeader: { type: Boolean, default: false },
    fixedFooter: { type: Boolean, default: false },
    fixedLeftDrawer: { type: Boolean, default: false },
    fixedRightDrawer: { type: Boolean, default: false },
    headerOverLeftDrawer: { type: Boolean, default: true },
    headerOverRightDrawer: { type: Boolean, default: true },
    footerOverLeftDrawer: { type: Boolean, default: true },
    footerOverRightDrawer: { type: Boolean, default: true },
    container: { type: Boolean, default: false },
    transitionDuration: { type: String, default: undefined }
  },
  setup(props, { slots }) {
    return () =>
      h(
        'cdmt-layout',
        {
          fixedHeader: props.fixedHeader,
          fixedFooter: props.fixedFooter,
          fixedLeftDrawer: props.fixedLeftDrawer,
          fixedRightDrawer: props.fixedRightDrawer,
          headerOverLeftDrawer: props.headerOverLeftDrawer,
          headerOverRightDrawer: props.headerOverRightDrawer,
          footerOverLeftDrawer: props.footerOverLeftDrawer,
          footerOverRightDrawer: props.footerOverRightDrawer,
          container: props.container,
          transitionDuration: props.transitionDuration
        },
        slots.default?.()
      )
  }
})
