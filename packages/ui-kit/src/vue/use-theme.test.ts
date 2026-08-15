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

beforeEach(() => {
  document.documentElement.removeAttribute('style')
})

describe('useTheme', () => {
  it('exposes the current mode/isDark/theme from the shared controller', async () => {
    const { useTheme } = await freshModules()

    const Comp = defineComponent({
      setup() {
        const theme = useTheme()
        return () => h('div', `${theme.mode.value}:${String(theme.isDark.value)}`)
      }
    })

    const wrapper = mount(Comp, { attachTo: document.body })

    expect(wrapper.text()).toBe('light:false')
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

  it('setMode/toggleMode/setTheme returned from the composable act on the real controller', async () => {
    const { useTheme, getThemeController } = await freshModules()

    const Comp = defineComponent({
      setup() {
        const theme = useTheme()
        return { theme }
      },
      render() {
        return h('div')
      }
    })

    const wrapper = mount(Comp, { attachTo: document.body })

    wrapper.vm.theme.toggleMode()

    expect(getThemeController().isDark).toBe(true)
  })
})
