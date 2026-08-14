# Contributing to `@codeminity/ui-kit-vue`

Follow the shape `CdmtInput`/`CdmtButton` already establish:

1. Create `src/components/<name>/Cdmt<Name>.ts` — a `defineComponent` with a render function (`h('cdmt-<name>', { ... })`), never a `.vue` SFC. See [DECISIONS.md#adr-001](./DECISIONS.md#adr-001-no-vue-sfc-files) for why.
2. Declare `props` matching the underlying custom element's own properties, typed against `ui-kit-core`'s exported types (e.g. `CdmtInputType`) rather than re-declaring string unions here.
3. If the component holds a value (an input, a future select/checkbox/textarea, ...), map it to `v-model`: a `modelValue` prop, an `emits: ['update:modelValue']`, and a one-line handler translating the underlying native event (see `CdmtInput.ts`) — per ui-kit-core's [DECISIONS.md#adr-007](../core/DECISIONS.md#adr-007-form-components-are-controlled-properties-sync-via-native-composed-events), this should never need more than that one line. If it doesn't hold a value (a button, an alert, ...), skip `v-model` entirely — plain prop pass-through plus slot forwarding, matching `CdmtButton.ts`.
4. Write `src/components/<name>/Cdmt<Name>.test.ts` with `@vue/test-utils`' `mount()`, `// @vitest-environment happy-dom`. Pass `attachTo: document.body` whenever the test needs to `await el.updateComplete` — Lit's update cycle only starts once the element is actually connected to a document, and Vue Test Utils mounts to a detached container by default; `updateComplete` hangs forever without it.
5. Export the component from `src/index.ts`.
6. If the component introduces real end-to-end behavior worth proving beyond unit-level (e.g. a new `v-model` translation), add or extend a spec under `e2e/` — bundle a small real app via `bundlePackageForBrowser` (see `e2e/v-model.spec.ts` and its `e2e/fixtures/app-entry.ts`) and drive it with real keyboard/mouse input through Playwright, the same discipline ui-kit-core's `DECISIONS.md#adr-006` established for theming.
7. Run `pnpm --filter @codeminity/ui-kit-vue build && pnpm --filter @codeminity/ui-kit-vue test` before opening a PR — also see the root [CONTRIBUTING.md](../../../CONTRIBUTING.md) for the full local check and changeset requirements.

New framework packages (`ui-kit-react`, `ui-kit-angular`, ...) follow the same "add it once a real consumer needs it" rule this package itself was added under — see `ui-kit-core`'s [CONTRIBUTING.md](../core/CONTRIBUTING.md).
