# @codeminity/ui-kit-core

## 0.2.0

### 🚀 Features

- Add `<cdmt-input>`: a text input (`text`/`email`/`password`) with `disabled` and `invalid` states. `value` is a controlled property that stays in sync as the user types, so a framework wrapper (e.g. Vue's `v-model`) can bind to it directly — listen for the native `input` event. Adds a new `colorDanger` brand token, used for the `invalid` state's border color.

## 0.1.0

### 🚀 Features

- Add a multi-theme config engine: `applyTheme`/`mergeTheme`, a `material` preset, and the `ThemeTokens`/`ThemeModeTokens`/`ThemePreset` types. Brand tokens (color/font/radius/transition) stay fixed across light/dark; background/surface/border/text tokens switch per color scheme. Replaces the previous "hand-write `:root { --cdmt-*: ... }`" approach with a config object a consuming app can apply, merge overrides onto, and re-apply at runtime for theme/mode switching.

### 🐛 Fixes

- Fix theme tokens resolving via a blanket `:host { --cdmt-*: <default>; }` block, which always won over an inherited value regardless of specificity and made `applyTheme` a no-op. Every themeable CSS property now resolves its token via `var(--cdmt-*, <default>)` at its own point of use instead. Also fixes `<cdmt-button>`'s hover transition, now scoped to `opacity` only, since a `transition` on the same property that also derives its value from a token never re-samples it in Chromium.

## 0.0.3

### 🐛 Fixes

- Fix `sideEffects: false` incorrectly letting a production bundler (Vite, Rollup, Webpack) tree-shake away `import '@codeminity/ui-kit-core'` entirely, since nothing consumed a named export from it — silently deleting the `customElements.define()` call that import exists for. Every component registers itself as a load-time side effect; `sideEffects` is now `true`.

## 0.0.2

### 🧪 Testing

- Verify the changesets release pipeline (version bump, OIDC npm publish, git tag, GitHub release with curated notes) end-to-end. No functional changes to the package itself.

## 0.0.1

### 🚀 Features

- Initial release: `<cdmt-button>` (`primary`/`secondary`/`ghost` variants, `disabled` state), built with Lit as a plain Custom Element — no Vue, React, or Angular dependency.
