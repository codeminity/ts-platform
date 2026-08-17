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

  const list = document.createElement('cdmt-list')

  const entries = pages.map((page) => {
    const item = document.createElement('cdmt-item')
    item.clickable = true

    const section = document.createElement('cdmt-item-section')
    const label = document.createElement('cdmt-item-label')
    label.textContent = page.title
    section.append(label)
    item.append(section)

    // `page.path` (e.g. `'#/button'`) is exactly what the old `<a href>`
    // used to navigate with — setting it straight onto `location.hash`
    // triggers the same `hashchange` the router already listens for,
    // without needing a real anchor element under `<cdmt-item>`.
    item.addEventListener('click', () => {
      location.hash = page.path
      // In overlay/mobile mode the drawer covers the page until dismissed —
      // docked mode (desktop) leaves it open across navigation, matching how
      // a persistent side nav is expected to behave there.
      if (!drawer.isDocked) drawer.hide()
    })

    list.append(item)
    return { page, item }
  })

  drawer.append(list)

  function setActive(path: string): void {
    for (const { page, item } of entries) {
      item.active = page.path === path
    }
  }

  return { element: drawer, setActive }
}
