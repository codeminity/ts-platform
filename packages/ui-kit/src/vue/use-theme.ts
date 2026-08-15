import { onScopeDispose, readonly, ref, shallowRef } from 'vue'

import { getThemeController } from '../theme/theme-controller.js'

import type { ThemeModeSetting } from '../theme/theme-controller.js'
import type { ThemePreset } from '../theme/theme.type.js'
import type { DeepReadonly, Ref, ShallowRef } from 'vue'

/**
 * @public
 */
export interface UseThemeResult {
  mode: DeepReadonly<Ref<ThemeModeSetting>>
  isDark: DeepReadonly<Ref<boolean>>
  theme: Readonly<ShallowRef<ThemePreset>>
  setMode(mode: ThemeModeSetting): void
  toggleMode(): void
  setTheme(theme: ThemePreset): void
}

/**
 * Reactive Vue access to the shared `getThemeController()` singleton (from
 * `@codeminity/ui-kit`'s "." entry) — `mode`/`isDark`/`theme` stay in sync
 * with any change made from anywhere (this composable, another component,
 * or plain non-Vue code), since it's the same underlying controller
 * instance every time.
 *
 * @public
 */
export function useTheme(): UseThemeResult {
  const controller = getThemeController()

  const mode = ref(controller.mode)
  const isDark = ref(controller.isDark)
  const theme = shallowRef(controller.theme)

  const unsubscribe = controller.subscribe(() => {
    mode.value = controller.mode
    isDark.value = controller.isDark
    theme.value = controller.theme
  })

  onScopeDispose(unsubscribe)

  return {
    mode: readonly(mode),
    isDark: readonly(isDark),
    theme: readonly(theme),
    setMode: controller.setMode.bind(controller),
    toggleMode: controller.toggleMode.bind(controller),
    setTheme: controller.setTheme.bind(controller)
  }
}
