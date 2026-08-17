export function renderFooter(): HTMLElement {
  const footer = document.createElement('cdmt-footer')
  footer.bordered = true

  const row = document.createElement('div')
  row.className = 'app-footer__row'

  const text = document.createElement('span')
  text.textContent = '© codeminity — MIT Licensed'

  const link = document.createElement('a')
  link.href = 'https://github.com/codeminity/ts-platform/blob/main/LICENSE'
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.textContent = 'License'

  row.append(text, link)
  footer.append(row)
  return footer
}
