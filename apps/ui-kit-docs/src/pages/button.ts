import { renderSnippetTabs } from '../components/snippet-tabs.js'
import { buttonSnippets } from '../content/button.snippets.js'

export function renderButtonPage(root: HTMLElement): undefined {
  const section = document.createElement('section')
  section.className = 'page'

  const heading = document.createElement('h1')
  heading.textContent = 'Button'
  section.append(heading)

  const description = document.createElement('p')
  description.textContent = '<cdmt-button> — variants: primary, secondary, ghost.'
  section.append(description)

  const demo = document.createElement('div')
  demo.className = 'demo'

  const primary = document.createElement('cdmt-button')
  primary.variant = 'primary'
  primary.textContent = 'Primary'

  const secondary = document.createElement('cdmt-button')
  secondary.variant = 'secondary'
  secondary.textContent = 'Secondary'

  const ghost = document.createElement('cdmt-button')
  ghost.variant = 'ghost'
  ghost.textContent = 'Ghost'

  const disabled = document.createElement('cdmt-button')
  disabled.variant = 'primary'
  disabled.disabled = true
  disabled.textContent = 'Disabled'

  demo.append(primary, secondary, ghost, disabled)
  section.append(demo)
  section.append(renderSnippetTabs(buttonSnippets))

  root.append(section)
}
