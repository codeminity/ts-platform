import { getThemeController } from '@codeminity/ui-kit'

import { mountAppShell } from './layout/app-shell.js'
import { getStoredThemeMode, setStoredThemeMode } from './preferences.js'
import { startRouter } from './router.js'
import { appStyles } from './styles.js'

declare global {
  var litIssuedWarnings: Set<string> | undefined
}

// Silences Lit's own "Lit is in dev mode" console warning — expected here
// (this docs app's dev server never runs as a production build) but noisy on
// every reload. lit-html queues that warning as a microtask the first time
// any lit-html module is evaluated (see its own `issueWarning`, gated on
// `globalThis.litIssuedWarnings`); this only needs to run somewhere in this
// file's synchronous top-level scope, before that queued microtask actually
// fires — the `@codeminity/ui-kit` import above already evaluated lit-html's
// module body (which only *queues* the warning) by the time this line runs.
globalThis.litIssuedWarnings ??= new Set()
globalThis.litIssuedWarnings.add('dev-mode')

const styleEl = document.createElement('style')
styleEl.textContent = appStyles
document.head.append(styleEl)

const controller = getThemeController()
const storedMode = getStoredThemeMode()
if (storedMode) {
  controller.setMode(storedMode)
}

controller.subscribe(() => {
  setStoredThemeMode(controller.mode)
  // Keeps the inline boot script's guess in sync while the app is open —
  // see index.html for why the browser's own native color-scheme rendering
  // needs to be set explicitly, not left to auto-follow the OS preference.
  document.documentElement.style.colorScheme = controller.isDark ? 'dark' : 'light'
})

const root = document.getElementById('app')
if (!root) throw new Error('#app root not found')

const shell = mountAppShell(root)
startRouter(shell.pageRoot, shell.setActivePath)

// Re-enable transitions (suppressed by index.html's inline boot script) only
// after the first frame has actually been painted — a single rAF fires
// before that paint, so a nested one is needed to land after it.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('no-transition')
  })
})
