// Registers every `cdmt-*` custom element (button, input, ...) — a real
// load-time side effect, which is why this entry point's `sideEffects` is
// `true`, not `false`. Every Vue wrapper below renders one of these
// elements via `h()`, so it must already be registered by the time any of
// them mount.
import '../index.js'

export { CdmtButton } from './components/button/CdmtButton.js'
export { CdmtInput } from './components/form/input/CdmtInput.js'
export { CdmtDrawer } from './components/layout/drawer/CdmtDrawer.js'
export { CdmtFooter } from './components/layout/footer/CdmtFooter.js'
export { CdmtHeader } from './components/layout/header/CdmtHeader.js'
export { CdmtItem } from './components/list/item/CdmtItem.js'
export { CdmtItemLabel } from './components/list/item-label/CdmtItemLabel.js'
export { CdmtItemSection } from './components/list/item-section/CdmtItemSection.js'
export { CdmtLayout } from './components/layout/CdmtLayout.js'
export { CdmtList } from './components/list/CdmtList.js'
export { CdmtPage } from './components/layout/page/CdmtPage.js'
export { CdmtPageContainer } from './components/layout/page-container/CdmtPageContainer.js'

export { createUIKit } from './create-ui-kit.js'
export type { UIKitConfig } from './create-ui-kit.js'

export { useTheme } from './use-theme.js'
export type { UseThemeResult } from './use-theme.js'
