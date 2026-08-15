import { getStoredFramework, setStoredFramework } from '../preferences.js'

import type { Framework } from '../preferences.js'

const FRAMEWORK_LABELS: Record<Framework, string> = {
  core: 'Core',
  vue: 'Vue',
  react: 'React',
  angular: 'Angular'
}

/**
 * Every framework's usage is the *same* rendered `<cdmt-*>` element — only
 * the invocation code differs — so this shows one static snippet per
 * framework, not a separately-rendered live instance per tab. A missing
 * entry (e.g. `react` before that binding exists) just doesn't get a tab.
 */
export function renderSnippetTabs(snippets: Partial<Record<Framework, string>>): HTMLElement {
  const container = document.createElement('div')
  container.className = 'snippet-tabs'

  const tabRow = document.createElement('div')
  tabRow.className = 'snippet-tabs__row'

  const pre = document.createElement('pre')
  const code = document.createElement('code')
  pre.append(code)

  const available = (Object.keys(snippets) as Framework[]).filter((framework) =>
    Boolean(snippets[framework])
  )

  const tabs = available.map((framework) => {
    const tab = document.createElement('cdmt-button')
    tab.variant = 'ghost'
    tab.textContent = FRAMEWORK_LABELS[framework]
    tab.addEventListener('click', () => {
      select(framework)
    })
    tabRow.append(tab)
    return { framework, tab }
  })

  function select(framework: Framework): void {
    setStoredFramework(framework)
    code.textContent = snippets[framework] ?? ''
    for (const { framework: tabFramework, tab } of tabs) {
      tab.variant = tabFramework === framework ? 'primary' : 'ghost'
    }
  }

  const preferred = getStoredFramework()
  const firstAvailable = available[0]
  if (available.includes(preferred)) {
    select(preferred)
  } else if (firstAvailable) {
    select(firstAvailable)
  }

  container.append(tabRow, pre)
  return container
}
