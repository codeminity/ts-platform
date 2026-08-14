---
"@codeminity/ui-kit-core": minor
---

Add a multi-theme config engine: `applyTheme`/`mergeTheme`, a `material` preset, and the `ThemeTokens`/`ThemeModeTokens`/`ThemePreset` types. Brand tokens (color/font/radius/transition) stay fixed across light/dark; background/surface/border/text tokens switch per color scheme. Replaces the previous "hand-write `:root { --cdmt-*: ... }`" approach with a config object a consuming app can apply, merge overrides onto, and re-apply at runtime for theme/mode switching.

Every themeable CSS property resolves its token via `var(--cdmt-*, <default>)` at its own point of use, not a blanket `:host` custom-property block — the latter always wins over an inherited value regardless of specificity, which would make `applyTheme` a no-op. `<cdmt-button>`'s hover transition is scoped to `opacity` only, since a `transition` on the same property that also derives its value from a token never re-samples it in Chromium.
