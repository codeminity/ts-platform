import { pages } from '../components/page-registry.js'

export interface LeftDrawer {
  element: HTMLElementTagNameMap['cdmt-drawer']
  setActive: (path: string) => void
}

export function renderLeftDrawer(): LeftDrawer {
  const drawer = document.createElement('cdmt-drawer')
  drawer.width = 200
  drawer.bordered = true
  drawer.showIfAbove = true

  const nav = document.createElement('nav')
  nav.className = 'app-drawer'

  const links = pages.map((page) => {
    const link = document.createElement('a')
    link.href = page.path
    link.textContent = page.title
    // In overlay/mobile mode the drawer covers the page until dismissed —
    // docked mode (desktop) leaves it open across navigation, matching how
    // a persistent side nav is expected to behave there.
    link.addEventListener('click', () => {
      if (!drawer.isDocked) drawer.hide()
    })
    nav.append(link)
    return { page, link }
  })

  drawer.append(nav)

  function setActive(path: string): void {
    for (const { page, link } of links) {
      link.classList.toggle('active', page.path === path)
    }
  }

  return { element: drawer, setActive }
}
