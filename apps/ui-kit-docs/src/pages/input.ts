import { renderSnippetTabs } from '../components/snippet-tabs.js'
import { inputSnippets } from '../content/input.snippets.js'

export function renderInputPage(root: HTMLElement): undefined {
  const section = document.createElement('section')
  section.className = 'page'

  const heading = document.createElement('h1')
  heading.textContent = 'Input'
  section.append(heading)

  const description = document.createElement('p')
  description.textContent =
    '<cdmt-input> — types: text, email, password. value is a controlled property, kept in sync as you type.'
  section.append(description)

  const demo = document.createElement('div')
  demo.className = 'demo'

  const text = document.createElement('cdmt-input')
  text.placeholder = 'Your name'

  const email = document.createElement('cdmt-input')
  email.type = 'email'
  email.placeholder = 'you@example.com'

  const password = document.createElement('cdmt-input')
  password.type = 'password'
  password.placeholder = 'Password'

  const disabled = document.createElement('cdmt-input')
  disabled.placeholder = 'Disabled'
  disabled.disabled = true

  const invalid = document.createElement('cdmt-input')
  invalid.type = 'email'
  invalid.invalid = true
  invalid.value = 'not-an-email'

  demo.append(text, email, password, disabled, invalid)
  section.append(demo)
  section.append(renderSnippetTabs(inputSnippets))

  root.append(section)
}
