import { pages } from '../components/page-registry.js'

export interface LeftDrawer {
  element: HTMLElement
  setActive: (path: string) => void
}

export function renderLeftDrawer(): LeftDrawer {
  const nav = document.createElement('nav')
  nav.className = 'app-drawer'

  const links = pages.map((page) => {
    const link = document.createElement('a')
    link.href = page.path
    link.textContent = page.title
    nav.append(link)
    return { page, link }
  })

  function setActive(path: string): void {
    for (const { page, link } of links) {
      link.classList.toggle('active', page.path === path)
    }
  }

  return { element: nav, setActive }
}
