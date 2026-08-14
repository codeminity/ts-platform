---
"@codeminity/ui-kit-core": minor
---

Add a multi-theme config engine: `applyTheme`/`mergeTheme`, a `material` preset, and the `ThemeTokens`/`ThemeModeTokens`/`ThemePreset` types. Brand tokens (color/font/radius/transition) stay fixed across light/dark; background/surface/border/text tokens switch per color scheme. Replaces the previous "hand-write `:root { --cdmt-*: ... }`" approach with a config object a consuming app can apply, merge overrides onto, and re-apply at runtime for theme/mode switching.
