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

describe('createUIKit', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style')
  })

  it('applies material/light by default', async () => {
    const { createUIKit, getThemeController } = await freshModules()

    const app = createApp({ render: () => null })
    app.use(createUIKit())

    expect(document.documentElement.style.getPropertyValue('--cdmt-color-primary')).toBe(
      material.tokens.colors.primary.light.value
    )
    expect(getThemeController().mode).toBe('light')
  })

  it('applies overrides layered onto the base theme', async () => {
    const { createUIKit } = await freshModules()

    const app = createApp({ render: () => null })
    app.use(createUIKit({ overrides: { tokens: { radiusMd: '2px' } } }))

    expect(document.documentElement.style.getPropertyValue('--cdmt-radius-md')).toBe('2px')
  })
})
