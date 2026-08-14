# Architecture

This document describes the internal design of `@codeminity/ui-kit-vue`.

---

## Goals

Let a Vue app use `@codeminity/ui-kit-core`'s components the way it uses any other Vue component — `v-model` where a component holds a value, typed props, native events with no translation — instead of hand-writing `:value`/`@input` wiring against the raw custom elements every time.

## Package Structure

```text
src/
├── index.ts             # public entry point — also registers every cdmt-* custom element (side effect)
└── components/          # one folder per wrapped component, e.g. components/input/CdmtInput.ts
```

Only `src/index.ts`'s exports are public API.

## Design Constraints

- Every wrapper is a `defineComponent` with a render function (`h()`), never a `.vue` SFC — see [DECISIONS.md](./DECISIONS.md#adr-001-no-vue-sfc-files)
- A wrapper's own logic is limited to prop pass-through and, for components that hold a value, translating the underlying native event into `update:modelValue` — see ui-kit-core's [DECISIONS.md#adr-007](../core/DECISIONS.md#adr-007-form-components-are-controlled-properties-sync-via-native-composed-events) for why this translation is a one-liner
- `vue` is a `peerDependency`, never bundled into this package's own output — the consuming app supplies its own Vue instance

## Non-Goals

- Re-implementing any component's visuals, theming, or behavior — that all stays in `@codeminity/ui-kit-core`; this package only adapts its API surface to Vue idioms
- A wrapper for every `ui-kit-core` component immediately — added as onfitever (the real consumer this package exists for) actually needs each one, not speculatively ahead of it
