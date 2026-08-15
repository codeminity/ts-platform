import { defineComponent, h } from 'vue'

/**
 * Vue wrapper for `<cdmt-page-container>` — a thin translation layer only,
 * all real behavior lives in `@codeminity/ui-kit`'s `CdmtPageContainer` Lit
 * component.
 *
 * @public
 */
export const CdmtPageContainer = defineComponent({
  name: 'CdmtPageContainer',
  setup(_props, { slots }) {
    return () => h('cdmt-page-container', {}, slots.default?.())
  }
})
