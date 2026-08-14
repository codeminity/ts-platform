import { createApp, h, ref } from 'vue'

import { CdmtButton, CdmtInput } from '../../src/index.js'

// A minimal real Vue app exercising both wrappers the same way a consuming
// app would: v-model on the input, a plain @click on the button. Bundled
// whole (Vue, ui-kit-core, ui-kit-vue) by bundlePackageForBrowser and
// mounted in a real page — see ../v-model.spec.ts.
const App = {
  setup() {
    const email = ref('')
    const clicks = ref(0)

    return () =>
      h('div', [
        h(CdmtInput, {
          id: 'target-input',
          type: 'email',
          modelValue: email.value,
          'onUpdate:modelValue': (value: string) => {
            email.value = value
          }
        }),
        h('div', { id: 'echo' }, email.value),
        h(
          CdmtButton,
          {
            id: 'target-button',
            onClick: () => {
              clicks.value++
            }
          },
          () => 'Click me'
        ),
        h('div', { id: 'click-count' }, String(clicks.value))
      ])
  }
}

createApp(App).mount('#app')
