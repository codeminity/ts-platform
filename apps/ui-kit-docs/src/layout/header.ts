import { getThemeController } from '@codeminity/ui-kit'

export function renderHeader(onToggleDrawer: () => void): HTMLElement {
  const header = document.createElement('cdmt-header')
  header.bordered = true

  const row = document.createElement('div')
  row.className = 'app-header__row'

  const menuToggle = document.createElement('cdmt-button')
  menuToggle.variant = 'ghost'
  menuToggle.textContent = '☰'
  menuToggle.setAttribute('aria-label', 'Toggle navigation')
  menuToggle.addEventListener('click', onToggleDrawer)

  const title = document.createElement('span')
  title.className = 'app-header__title'
  title.textContent = '@codeminity/ui-kit'

  const spacer = document.createElement('span')
  spacer.className = 'app-header__spacer'

  const themeToggle = document.createElement('cdmt-button')
  themeToggle.variant = 'ghost'

  row.append(menuToggle, title, spacer, themeToggle)
  header.append(row)

  const controller = getThemeController()

  // Shows what clicking switches *to*, not the current mode — so when the
  // page is light, the button reads "Dark" (the action), not "Light" (the
  // current state, which is already visually obvious from the page itself).
  function syncToggle(): void {
    themeToggle.textContent = controller.isDark ? '☀️ Light' : '🌙 Dark'
  }

  themeToggle.addEventListener('click', () => {
    controller.toggleMode()
  })

  controller.subscribe(syncToggle)
  syncToggle()

  return header
}
