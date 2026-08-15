// Registers every `cdmt-*` custom element (button, input, ...) — a real
// load-time side effect, which is why this entry point's `sideEffects` is
// `true`, not `false`. Every Vue wrapper below renders one of these
// elements via `h()`, so it must already be registered by the time any of
// them mount.
import '../index.js'

export { CdmtButton } from './components/button/CdmtButton.js'
export { CdmtInput } from './components/input/CdmtInput.js'
export { CdmtDrawer } from './components/drawer/CdmtDrawer.js'
export { CdmtFooter } from './components/footer/CdmtFooter.js'
export { CdmtHeader } from './components/header/CdmtHeader.js'
export { CdmtLayout } from './components/layout/CdmtLayout.js'
export { CdmtPage } from './components/page/CdmtPage.js'
export { CdmtPageContainer } from './components/page-container/CdmtPageContainer.js'

export { createUIKit } from './create-ui-kit.js'
export type { UIKitConfig } from './create-ui-kit.js'

export { useTheme } from './use-theme.js'
export type { UseThemeResult } from './use-theme.js'
