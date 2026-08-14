// Registers every `cdmt-*` custom element (button, input, ...) — a real
// load-time side effect (see ui-kit-core's DECISIONS.md#adr-004), which is
// why this package's own `sideEffects` is `true`, not `false`. Every Vue
// wrapper below renders one of these elements via `h()`, so it must already
// be registered by the time any of them mount.
import '@codeminity/ui-kit-core'

export { CdmtButton } from './components/button/CdmtButton.js'
export { CdmtInput } from './components/input/CdmtInput.js'
