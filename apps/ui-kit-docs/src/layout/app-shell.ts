import { renderHeader } from './header.js'
import { renderLeftDrawer } from './left-drawer.js'

export interface AppShell {
  pageRoot: HTMLElement
  setActivePath: (path: string) => void
}

/**
 * Mounted once by `main.ts` — the header and drawer never get rebuilt on
 * navigation, only `pageRoot`'s contents change (see `router.ts`).
 */
export function mountAppShell(root: HTMLElement): AppShell {
  const drawer = renderLeftDrawer()
  const header = renderHeader(() => {
    drawer.element.toggle()
  })

  const pageRoot = document.createElement('main')
  pageRoot.className = 'app-main'

  const page = document.createElement('cdmt-page')
  page.append(pageRoot)

  const pageContainer = document.createElement('cdmt-page-container')
  pageContainer.append(page)

  const layout = document.createElement('cdmt-layout')
  // Header must be fixed ('H') so it stays above the drawer's own fixed
  // overlay in mobile mode (the drawer always renders as a fixed overlay
  // there, per its own documented behavior) — otherwise the drawer covers
  // the header, including its hamburger toggle, making it unclickable.
  layout.view = 'Hhh lpr fff'
  layout.append(header, drawer.element, pageContainer)

  root.replaceChildren(layout)

  return { pageRoot, setActivePath: drawer.setActive }
}
