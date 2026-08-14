# Architecture

This document describes the internal design of `@codeminity/ui-kit-core`.

---

## Goals

Every UI component here is a plain Custom Element (Web Components + [Lit](https://lit.dev)), so it works inside any app — Vue, React, Angular, or none — without that app adopting anything. Framework-specific ergonomics (nicer prop typing, `v-model`-style bindings) belong in a sibling adapter package (`packages/ui-kit/vue`, `packages/ui-kit/react`, ...), added on demand, never here.

## Package Structure

```text
src/
├── index.ts             # public entry point
├── components/          # one folder per component, e.g. components/button/button.ts
└── theme/                # design tokens, theme presets, and the apply/merge engine — consumed by every component
```

Only `src/index.ts`'s exports are public API. Everything else is an implementation detail.

## Design Constraints

- No Vue/React/Angular dependency, ever — see the root [ARCHITECTURE.md](../../../ARCHITECTURE.md#core-layer)'s carve-out for this category
- Reactive properties via Lit's `static properties`, not decorators — see [DECISIONS.md](./DECISIONS.md#adr-002-static-properties-not-decorators)
- Shared theme values live in `theme/`, consumed via CSS custom properties — see [DECISIONS.md](./DECISIONS.md#adr-003-design-tokens-as-css-custom-properties)
- Themes are applied via `applyTheme`/`mergeTheme`, never a hand-written CSS override block — see [DECISIONS.md](./DECISIONS.md#adr-005-multi-theme-presets-applied-via-a-config-engine-not-hand-written-css)

## Non-Goals

- Framework-specific bindings (that's `packages/ui-kit/vue`/`react`/`angular`, added when a real consumer needs one)
- Application-level layout/theming decisions — this package ships primitives and sane defaults, not a design system's opinions about page structure
