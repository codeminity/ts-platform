---
'@codeminity/ui-kit-core': patch
---

Fix `sideEffects: false` incorrectly letting a production bundler (Vite, Rollup, Webpack) tree-shake away `import '@codeminity/ui-kit-core'` entirely, since nothing consumed a named export from it — silently deleting the `customElements.define()` call that import exists for. Every component registers itself as a load-time side effect; `sideEffects` is now `true`.
