// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'

import { material } from '../theme/presets/material.js'

import type { createUIKit as CreateUIKit } from './create-ui-kit.js'
import type { getThemeController as GetThemeController } from '../theme/theme-controller.js'

async function freshModules(): Promise<{
  createUIKit: typeof CreateUIKit
  getThemeController: typeof GetThemeController
}> {
  vi.resetModules()
  const createUIKitMod = await import('./create-ui-kit.js')
  const controllerMod = await import('../theme/theme-controller.js')
  return {
    createUIKit: createUIKitMod.createUIKit,
    getThemeController: controllerMod.getThemeController
  }
}

beforeEach(() => {
  document.documentElement.removeAttribute('style')
})

describe('createUIKit', () => {
  it('applies material/light by default', async () => {
    const { createUIKit, getThemeController } = await freshModules()

    const app = createApp({ render: () => null })
    app.use(createUIKit())

    expect(document.documentElement.style.getPropertyValue('--cdmt-color-primary')).toBe(
      material.tokens.colors.primary.light.value
    )
    expect(getThemeController().mode).toBe('light')
  })

  it('applies the given mode', async () => {
    const { createUIKit } = await freshModules()

    const app = createApp({ render: () => null })
    app.use(createUIKit({ mode: 'dark' }))

    expect(document.documentElement.style.getPropertyValue('--cdmt-color-primary')).toBe(
      material.tokens.colors.primary.dark.value
    )
  })

  it('applies overrides layered onto the base theme', async () => {
    const { createUIKit } = await freshModules()

    const app = createApp({ render: () => null })
    app.use(createUIKit({ overrides: { tokens: { radiusMd: '2px' } } }))

    expect(document.documentElement.style.getPropertyValue('--cdmt-radius-md')).toBe('2px')
  })

  it('accepts a fully custom theme', async () => {
    const { createUIKit } = await freshModules()
    const customTheme = { tokens: { ...material.tokens, radiusMd: '99px' } }

    const app = createApp({ render: () => null })
    app.use(createUIKit({ theme: customTheme }))

    expect(document.documentElement.style.getPropertyValue('--cdmt-radius-md')).toBe('99px')
  })
})
