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
  const layout = document.createElement('div')
  layout.className = 'app-layout'

  const header = renderHeader()
  const drawer = renderLeftDrawer()

  const pageRoot = document.createElement('main')
  pageRoot.className = 'app-main'

  const body = document.createElement('div')
  body.className = 'app-body'
  body.append(drawer.element, pageRoot)

  layout.append(header, body)
  root.replaceChildren(layout)

  return { pageRoot, setActivePath: drawer.setActive }
}
