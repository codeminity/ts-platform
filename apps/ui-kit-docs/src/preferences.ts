import type { ThemeModeSetting } from '@codeminity/ui-kit'

/**
 * The frameworks a snippet can be shown in. `core` is the plain Custom
 * Element usage — always available, since every framework binding wraps it.
 */
export type Framework = 'core' | 'vue' | 'react' | 'angular'

const THEME_MODE_KEY = 'ui-kit-docs:theme-mode'
const FRAMEWORK_KEY = 'ui-kit-docs:framework'

function isThemeModeSetting(value: string | null): value is ThemeModeSetting {
  return value === 'light' || value === 'dark' || value === 'auto'
}

function isFramework(value: string | null): value is Framework {
  return value === 'core' || value === 'vue' || value === 'react' || value === 'angular'
}

export function getStoredThemeMode(): ThemeModeSetting | undefined {
  const value = localStorage.getItem(THEME_MODE_KEY)
  return isThemeModeSetting(value) ? value : undefined
}

export function setStoredThemeMode(mode: ThemeModeSetting): void {
  localStorage.setItem(THEME_MODE_KEY, mode)
}

/** Shared across every page — pick Vue once, every component's snippet defaults to Vue. */
export function getStoredFramework(): Framework {
  const value = localStorage.getItem(FRAMEWORK_KEY)
  return isFramework(value) ? value : 'core'
}

export function setStoredFramework(framework: Framework): void {
  localStorage.setItem(FRAMEWORK_KEY, framework)
}
