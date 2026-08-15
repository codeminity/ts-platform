import { getThemeController } from '@codeminity/ui-kit'

export function renderHeader(): HTMLElement {
  const header = document.createElement('header')
  header.className = 'app-header'

  const title = document.createElement('span')
  title.className = 'app-header__title'
  title.textContent = '@codeminity/ui-kit'
  header.append(title)

  const toggle = document.createElement('cdmt-button')
  toggle.variant = 'ghost'
  header.append(toggle)

  const controller = getThemeController()

  // Shows what clicking switches *to*, not the current mode — so when the
  // page is light, the button reads "Dark" (the action), not "Light" (the
  // current state, which is already visually obvious from the page itself).
  function syncToggle(): void {
    toggle.textContent = controller.isDark ? '☀️ Light' : '🌙 Dark'
  }

  toggle.addEventListener('click', () => {
    controller.toggleMode()
  })

  controller.subscribe(syncToggle)
  syncToggle()

  return header
}
