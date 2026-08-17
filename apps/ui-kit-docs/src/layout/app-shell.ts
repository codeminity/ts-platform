import { renderFooter } from './footer.js'
import { renderHeader } from './header.js'
import { renderLeftDrawer } from './left-drawer.js'

export interface AppShell {
  pageRoot: HTMLElement
  setActivePath: (path: string) => void
}

/**
 * Mounted once by `main.ts` — the header, drawer, and footer never get
 * rebuilt on navigation, only `pageRoot`'s contents change (see `router.ts`).
 */
export function mountAppShell(root: HTMLElement): AppShell {
  const drawer = renderLeftDrawer()
  const header = renderHeader(() => {
    drawer.element.toggle()
  })
  const footer = renderFooter()

  const pageRoot = document.createElement('main')
  pageRoot.className = 'app-main'

  const page = document.createElement('cdmt-page')
  page.append(pageRoot)

  const pageContainer = document.createElement('cdmt-page-container')
  pageContainer.append(page)

  const layout = document.createElement('cdmt-layout')

  layout.fixedLeftDrawer = true
  layout.fixedHeader = true
  layout.fixedFooter = true
  layout.footerOverLeftDrawer = false
  layout.headerOverLeftDrawer = false

  layout.append(header, drawer.element, pageContainer, footer)

  root.replaceChildren(layout)

  return { pageRoot, setActivePath: drawer.setActive }
}
