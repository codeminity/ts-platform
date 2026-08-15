import { cloneVNode, defineComponent, h, ref } from 'vue'

import type {
  CdmtDrawer as CdmtDrawerElement,
  CdmtDrawerBehavior,
  CdmtDrawerSide
} from '../../../components/drawer/drawer.js'
import type { PropType } from 'vue'

/**
 * Vue wrapper for `<cdmt-drawer>` — a thin translation layer only, all real
 * behavior lives in `@codeminity/ui-kit`'s `CdmtDrawer` Lit component.
 * Exposes `show`/`hide`/`toggle` (via a template ref) by delegating to the
 * underlying element's own public methods.
 *
 * @public
 */
export const CdmtDrawer = defineComponent({
  name: 'CdmtDrawer',
  props: {
    modelValue: { type: Boolean, default: false },
    side: { type: String as PropType<CdmtDrawerSide>, default: 'left' },
    overlay: { type: Boolean, default: false },
    width: { type: Number, default: 300 },
    mini: { type: Boolean, default: false },
    miniWidth: { type: Number, default: 57 },
    miniToOverlay: { type: Boolean, default: false },
    noMiniAnimation: { type: Boolean, default: false },
    breakpoint: { type: Number, default: 1023 },
    behavior: { type: String as PropType<CdmtDrawerBehavior>, default: 'default' },
    bordered: { type: Boolean, default: false },
    elevated: { type: Boolean, default: false },
    persistent: { type: Boolean, default: false },
    showIfAbove: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'before-show', 'show', 'before-hide', 'hide'],
  setup(props, { slots, emit, expose }) {
    const elRef = ref<CdmtDrawerElement>()

    expose({
      show: () => elRef.value?.show(),
      hide: () => elRef.value?.hide(),
      toggle: () => elRef.value?.toggle()
    })

    function handleModelValueChange(event: Event): void {
      emit('update:modelValue', (event as CustomEvent<boolean>).detail)
    }

    return () => {
      const miniSlotContent = slots.mini?.().map((vnode) => cloneVNode(vnode, { slot: 'mini' }))

      return h(
        'cdmt-drawer',
        {
          ref: elRef,
          modelValue: props.modelValue,
          side: props.side,
          overlay: props.overlay,
          width: props.width,
          mini: props.mini,
          miniWidth: props.miniWidth,
          miniToOverlay: props.miniToOverlay,
          noMiniAnimation: props.noMiniAnimation,
          breakpoint: props.breakpoint,
          behavior: props.behavior,
          bordered: props.bordered,
          elevated: props.elevated,
          persistent: props.persistent,
          showIfAbove: props.showIfAbove,
          onCdmtModelValueChange: handleModelValueChange,
          onCdmtBeforeShow: () => {
            emit('before-show')
          },
          onCdmtShow: () => {
            emit('show')
          },
          onCdmtBeforeHide: () => {
            emit('before-hide')
          },
          onCdmtHide: () => {
            emit('hide')
          }
        },
        [slots.default?.(), miniSlotContent]
      )
    }
  }
})
