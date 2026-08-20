// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import type { useTheme as UseTheme } from './use-theme.js'
import type { getThemeController as GetThemeController } from '../theme/theme-controller.js'

async function freshModules(): Promise<{
  useTheme: typeof UseTheme
  getThemeController: typeof GetThemeController
}> {
  vi.resetModules()
  const useThemeMod = await import('./use-theme.js')
  const controllerMod = await import('../theme/theme-controller.js')
  return { useTheme: useThemeMod.useTheme, getThemeController: controllerMod.getThemeController }
}

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style')
  })

  it('updates reactively when the controller changes from outside the composable', async () => {
    const { useTheme, getThemeController } = await freshModules()

    const Comp = defineComponent({
      setup() {
        const theme = useTheme()
        return () => h('div', `${theme.mode.value}:${String(theme.isDark.value)}`)
      }
    })

    const wrapper = mount(Comp, { attachTo: document.body })

    getThemeController().setMode('dark')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toBe('dark:true')
  })
})
