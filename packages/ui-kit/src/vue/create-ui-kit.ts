import { mergeTheme } from '../theme/apply-theme.js'
import { material } from '../theme/presets/material.js'
import { getThemeController } from '../theme/theme-controller.js'

import type { ThemePresetOverrides } from '../theme/apply-theme.js'
import type { ThemeModeSetting } from '../theme/theme-controller.js'
import type { ThemePreset } from '../theme/theme.type.js'
import type { Plugin } from 'vue'

/**
 * Initial theme setup for `createUIKit`. Everything is optional — with no
 * config at all, the app gets `material` in `'light'` mode.
 *
 * @public
 */
export interface UIKitConfig {
  theme?: ThemePreset
  mode?: ThemeModeSetting
  overrides?: ThemePresetOverrides
}

/**
 * A Vue plugin (`app.use(createUIKit(config))`) that applies the initial
 * theme once, at boot, via the shared `getThemeController()` singleton
 * (from `@codeminity/ui-kit`'s "." entry). Deliberately does *not* register
 * any components — `CdmtButton`/`CdmtInput` stay per-file imports, so
 * nothing here forces a whole catalog into every bundle as it grows.
 *
 * @public
 */
export function createUIKit(config: UIKitConfig = {}): Plugin {
  return {
    install() {
      const controller = getThemeController()

      const theme = config.overrides
        ? mergeTheme(config.theme ?? material, config.overrides)
        : (config.theme ?? material)

      controller.setTheme(theme)
      controller.setMode(config.mode ?? 'light')
    }
  }
}
