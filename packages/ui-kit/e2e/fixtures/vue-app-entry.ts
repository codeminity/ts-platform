import { createApp, h, ref } from 'vue'

// Imports from the built `dist/` output, not `src/` — mirrors what a real
// consumer actually sees through the package's `exports` map, and is what
// makes `sideEffects` (scoped to `dist/**`) apply at all when this fixture
// gets bundled for the browser.
import { CdmtButton, CdmtInput, createUIKit } from '../../dist/vue/index.js'

const App = {
  setup() {
    const email = ref('')
    const clickCount = ref(0)

    return () =>
      h('div', [
        h(CdmtInput, {
          id: 'target-input',
          modelValue: email.value,
          type: 'email',
          'onUpdate:modelValue': (value: string) => {
            email.value = value
          }
        }),
        h('span', { id: 'echo' }, email.value),
        h(
          CdmtButton,
          {
            id: 'target-button',
            variant: 'primary',
            onClick: () => {
              clickCount.value += 1
            }
          },
          () => 'Click me'
        ),
        h('span', { id: 'click-count' }, String(clickCount.value))
      ])
  }
}

const app = createApp(App)
app.use(createUIKit())
app.mount('#app')
