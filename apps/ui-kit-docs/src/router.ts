import { homePage, pages } from './components/page-registry.js'

import type { Page } from './components/page-registry.js'

function currentPath(): string {
  return location.hash || homePage.path
}

function findPage(path: string): Page {
  return pages.find((page) => page.path === path) ?? homePage
}

/**
 * Hash-based routing (`#/button`, `#/input`, ...) — no router library, just
 * `hashchange`. Only ever swaps `pageRoot`'s contents; the app shell around
 * it (header, drawer) is mounted once by `mountAppShell` and never rebuilt.
 */
export function startRouter(pageRoot: HTMLElement, onNavigate: (path: string) => void): void {
  let cleanup: (() => void) | undefined

  function render(): void {
    cleanup?.()
    pageRoot.replaceChildren()
    const page = findPage(currentPath())
    cleanup = page.render(pageRoot)
    onNavigate(page.path)
  }

  window.addEventListener('hashchange', render)
  render()
}
