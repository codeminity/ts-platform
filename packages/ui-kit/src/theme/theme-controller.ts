import { applyTheme } from './apply-theme.js'
import { material } from './presets/material.js'

import type { ThemeMode, ThemePreset } from './theme.type.js'

/**
 * A {@link ThemeMode}, plus `'auto'` — follow the OS/browser's
 * `prefers-color-scheme` and re-resolve automatically when it changes.
 *
 * @public
 */
export type ThemeModeSetting = ThemeMode | 'auto'

/**
 * A live, stateful handle on the current theme — set once, read/mutate from
 * anywhere (no framework required). Mirrors the ergonomics of a UI
 * framework's own "current theme" singleton: mutating methods re-paint via
 * {@link applyTheme} and notify every {@link ThemeController.subscribe}
 * listener.
 *
 * @public
 */
export interface ThemeController {
  readonly theme: ThemePreset
  readonly mode: ThemeModeSetting
  readonly isDark: boolean
  setMode(mode: ThemeModeSetting): void
  toggleMode(): void
  setTheme(theme: ThemePreset): void
  /** Returns an unsubscribe function. */
  subscribe(callback: () => void): () => void
}

class ThemeControllerImpl implements ThemeController {
  theme: ThemePreset
  mode: ThemeModeSetting
  isDark: boolean

  #target: HTMLElement
  #listeners = new Set<() => void>()
  #mediaQuery: MediaQueryList | undefined

  constructor(target: HTMLElement, theme: ThemePreset, mode: ThemeModeSetting) {
    this.#target = target
    this.theme = theme
    this.mode = mode
    this.isDark = this.#resolveIsDark(mode)
    this.#paint()
  }

  // No `typeof window` guard: this whole package is Lit-based Web Components,
  // which already require a real DOM to load at all (customElements.define()
  // throws immediately in plain Node) — a no-DOM environment can never reach
  // this code, so guarding for it here would be dead defensive code.
  #resolveIsDark(mode: ThemeModeSetting): boolean {
    if (mode === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    return mode === 'dark'
  }

  #paint(): void {
    applyTheme(this.#target, this.theme, this.isDark ? 'dark' : 'light')
  }

  #notify(): void {
    for (const listener of this.#listeners) {
      listener()
    }
  }

  #watchSystemScheme(): void {
    if (this.#mediaQuery) return

    this.#mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    this.#mediaQuery.addEventListener('change', (event) => {
      if (this.mode !== 'auto') return

      this.isDark = event.matches
      this.#paint()
      this.#notify()
    })
  }

  setMode(mode: ThemeModeSetting): void {
    this.mode = mode
    this.isDark = this.#resolveIsDark(mode)

    if (mode === 'auto') {
      this.#watchSystemScheme()
    }

    this.#paint()
    this.#notify()
  }

  toggleMode(): void {
    this.setMode(this.isDark ? 'light' : 'dark')
  }

  setTheme(theme: ThemePreset): void {
    this.theme = theme
    this.#paint()
    this.#notify()
  }

  subscribe(callback: () => void): () => void {
    this.#listeners.add(callback)
    return () => this.#listeners.delete(callback)
  }
}

let instance: ThemeController | undefined

/**
 * Returns the app-wide {@link ThemeController} singleton, creating it (with
 * the `material` preset, `'light'` mode, applied to `document.documentElement`)
 * on first call. Every later call — from any framework, or none — returns
 * the same instance, so theme state is always genuinely shared.
 *
 * @public
 */
export function getThemeController(target?: HTMLElement): ThemeController {
  instance ??= new ThemeControllerImpl(target ?? document.documentElement, material, 'light')

  return instance
}
