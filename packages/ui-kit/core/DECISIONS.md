# Architecture Decisions (`@codeminity/ui-kit-core`)

This document records decisions specific to this package. Repo-wide decisions live in the [root `DECISIONS.md`](../../../DECISIONS.md) instead.

---

## Index

- [ADR-001: Web Components (Lit), Not a Framework-Specific Library](#adr-001-web-components-lit-not-a-framework-specific-library)
- [ADR-002: `static properties`, Not Decorators](#adr-002-static-properties-not-decorators)
- [ADR-003: Design Tokens as CSS Custom Properties](#adr-003-design-tokens-as-css-custom-properties)

---

## ADR-001: Web Components (Lit), Not a Framework-Specific Library

**Context:** A component library built for one framework (a Vue library, a React library) can't be used by a developer working in a different framework without a rewrite.

**Decision:** Components are built as plain Custom Elements using Lit, with zero Vue/React/Angular in this package's dependency graph.

**Consequences:** A component built this way works inside any existing app, regardless of which framework (or none) that app uses. Framework-specific packages (`packages/ui-kit/vue`, `packages/ui-kit/react`, ...) can wrap these components later, on demand, without this package ever depending back on them.

## ADR-002: `static properties`, Not Decorators

**Context:** Lit components conventionally declare reactive properties via `@property()` decorators. Vite 8's default transformer (Oxc) does not yet lower TC39 Stage-3 decorators ([oxc#9170](https://github.com/oxc-project/oxc/issues/9170), open, no timeline), and legacy `experimentalDecorators` is the TS-only mechanism TypeScript itself is deprecating.

**Decision:** Reactive properties are declared via `static properties = { ... }` plus `declare` fields, not decorators.

**Consequences:** `static properties` depends on neither of the above and is Lit's own fully-supported, permanent alternative — not a fallback. The tradeoff is slightly more boilerplate per property (a `declare` field plus a constructor default) than a single decorator line would need.

## ADR-003: Design Tokens as CSS Custom Properties

**Context:** Hardcoding color/font/spacing values directly in each component's `static styles` means a host app can't retheme anything without overriding individual component internals.

**Decision:** Shared theme values (color, font, radius, transition) live in [`src/theme/tokens.ts`](./src/theme/tokens.ts) as CSS custom properties applied to `:host`, and every component consumes them via `var(--cdmt-*)` instead of hardcoded values.

**Consequences:** CSS custom properties cross shadow DOM boundaries by inheritance, so a host app can retheme every component from `:root` without any JS-level theming API. Keeps color/font/spacing decisions in one place instead of duplicated per component.
