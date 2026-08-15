// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { material } from './presets/material.js'

import type { getThemeController as GetThemeController } from './theme-controller.js'

// `getThemeController()` is a module-level singleton — resetting modules and
// re-importing fresh for every test is what gives each test its own
// instance, instead of leaking state across tests via the cached module.
async function freshGetThemeController(): Promise<typeof GetThemeController> {
  vi.resetModules()
  const mod = await import('./theme-controller.js')
  return mod.getThemeController
}

let matchMediaListeners: ((event: MediaQueryListEvent) => void)[] = []
let matchMediaMatches = false
let matchMediaQueries: string[] = []
let matchMediaListenerTypes: string[] = []

beforeEach(() => {
  matchMediaListeners = []
  matchMediaMatches = false
  matchMediaQueries = []
  matchMediaListenerTypes = []

  vi.stubGlobal('matchMedia', (query: string) => {
    matchMediaQueries.push(query)
    return {
      matches: matchMediaMatches,
      media: query,
      addEventListener: (type: string, listener: (event: MediaQueryListEvent) => void) => {
        matchMediaListenerTypes.push(type)
        matchMediaListeners.push(listener)
      },
      removeEventListener: vi.fn()
    }
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getThemeController', () => {
  it('creates the singleton with material/light applied to document.documentElement by default', async () => {
    const getThemeController = await freshGetThemeController()

    const controller = getThemeController()

    expect(controller.theme).toEqual(material)
    expect(controller.mode).toBe('light')
    expect(controller.isDark).toBe(false)
    expect(document.documentElement.style.getPropertyValue('--cdmt-color-primary')).toBe(
      material.tokens.colors.primary.light.value
    )
  })

  it('returns the same instance on every call', async () => {
    const getThemeController = await freshGetThemeController()

    expect(getThemeController()).toBe(getThemeController())
  })

  it('setMode repaints and updates isDark', async () => {
    const getThemeController = await freshGetThemeController()
    const controller = getThemeController()

    controller.setMode('dark')

    expect(controller.isDark).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--cdmt-color-primary')).toBe(
      material.tokens.colors.primary.dark.value
    )
  })

  it('toggleMode flips light/dark, and mode itself is set to the literal string', async () => {
    const getThemeController = await freshGetThemeController()
    const controller = getThemeController()

    controller.toggleMode()
    expect(controller.isDark).toBe(true)
    expect(controller.mode).toBe('dark')

    controller.toggleMode()
    expect(controller.isDark).toBe(false)
    expect(controller.mode).toBe('light')
  })

  it("mode 'auto' resolves isDark from prefers-color-scheme, querying the real media feature", async () => {
    matchMediaMatches = true
    const getThemeController = await freshGetThemeController()
    const controller = getThemeController()

    controller.setMode('auto')

    expect(controller.isDark).toBe(true)
    expect(matchMediaQueries).toEqual([
      '(prefers-color-scheme: dark)',
      '(prefers-color-scheme: dark)'
    ])
    expect(matchMediaListenerTypes).toEqual(['change'])
  })

  it("setMode with a non-'auto' mode never touches matchMedia", async () => {
    const getThemeController = await freshGetThemeController()
    const controller = getThemeController()

    controller.setMode('dark')
    controller.setMode('light')

    expect(matchMediaQueries).toEqual([])
  })

  it("mode 'auto' re-resolves and notifies subscribers when the system scheme changes", async () => {
    const getThemeController = await freshGetThemeController()
    const controller = getThemeController()
    controller.setMode('auto')

    const listener = vi.fn()
    controller.subscribe(listener)

    matchMediaListeners.forEach((l) => {
      l({ matches: true } as MediaQueryListEvent)
    })

    expect(controller.isDark).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("setting mode to 'auto' twice only subscribes to matchMedia once", async () => {
    const getThemeController = await freshGetThemeController()
    const controller = getThemeController()

    controller.setMode('auto')
    controller.setMode('auto')

    // One `matchMedia()` call per `setMode('auto')` from `#resolveIsDark`
    // (2 total), but only the *first* call also sets up the change listener
    // via `#watchSystemScheme` — a second subscription would double-fire it.
    expect(matchMediaQueries).toHaveLength(3)
    expect(matchMediaListenerTypes).toEqual(['change'])
  })

  it("a system-scheme change is ignored once mode has moved away from 'auto'", async () => {
    const getThemeController = await freshGetThemeController()
    const controller = getThemeController()
    controller.setMode('auto')
    controller.setMode('light')

    const listener = vi.fn()
    controller.subscribe(listener)

    matchMediaListeners.forEach((l) => {
      l({ matches: true } as MediaQueryListEvent)
    })

    expect(controller.isDark).toBe(false)
    expect(listener).not.toHaveBeenCalled()
  })

  it('setTheme swaps the theme and repaints', async () => {
    const getThemeController = await freshGetThemeController()
    const controller = getThemeController()

    const customTheme = { tokens: { ...material.tokens, radiusMd: '2px' } }
    controller.setTheme(customTheme)

    expect(controller.theme).toBe(customTheme)
    expect(document.documentElement.style.getPropertyValue('--cdmt-radius-md')).toBe('2px')
  })

  it('subscribe notifies on setMode/toggleMode/setTheme, and the returned unsubscribe stops further calls', async () => {
    const getThemeController = await freshGetThemeController()
    const controller = getThemeController()

    const listener = vi.fn()
    const unsubscribe = controller.subscribe(listener)

    controller.setMode('dark')
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    controller.toggleMode()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
