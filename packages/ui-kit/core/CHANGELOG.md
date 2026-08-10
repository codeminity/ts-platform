# @codeminity/ui-kit-core

## 0.0.3

### 🐛 Fixes

- Fix `sideEffects: false` incorrectly letting a production bundler (Vite, Rollup, Webpack) tree-shake away `import '@codeminity/ui-kit-core'` entirely, since nothing consumed a named export from it — silently deleting the `customElements.define()` call that import exists for. Every component registers itself as a load-time side effect; `sideEffects` is now `true`.

## 0.0.2

### 🧪 Testing

- Verify the changesets release pipeline (version bump, OIDC npm publish, git tag, GitHub release with curated notes) end-to-end. No functional changes to the package itself.

## 0.0.1

### 🚀 Features

- Initial release: `<cdmt-button>` (`primary`/`secondary`/`ghost` variants, `disabled` state), built with Lit as a plain Custom Element — no Vue, React, or Angular dependency.
