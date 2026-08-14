# Architecture Decisions (`@codeminity/ui-kit-core`)

This document records decisions specific to this package. Repo-wide decisions live in the [root `DECISIONS.md`](../../../DECISIONS.md) instead.

---

## Index

- [ADR-001: Web Components (Lit), Not a Framework-Specific Library](#adr-001-web-components-lit-not-a-framework-specific-library)
- [ADR-002: `static properties`, Not Decorators](#adr-002-static-properties-not-decorators)
- [ADR-003: Design Tokens as CSS Custom Properties](#adr-003-design-tokens-as-css-custom-properties)
- [ADR-004: `sideEffects: true`, Not `false`](#adr-004-sideeffects-true-not-false)
- [ADR-005: Multi-Theme Presets Applied via a Config Engine, Not Hand-Written CSS](#adr-005-multi-theme-presets-applied-via-a-config-engine-not-hand-written-css)
- [ADR-006: Per-Use-Site `var()` Fallbacks, Not a Blanket `:host` Token Block](#adr-006-per-use-site-var-fallbacks-not-a-blanket-host-token-block)
- [ADR-007: Form Components Are Controlled Properties, Sync via Native Composed Events](#adr-007-form-components-are-controlled-properties-sync-via-native-composed-events)

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

## ADR-004: `sideEffects: true`, Not `false`

**Context:** `package.json` originally shipped with `"sideEffects": false` (copied from `packages/request/*`'s own package.json shape, where it's correct — those packages export pure functions with no load-time behavior). Every component here registers itself via a bare `customElements.define('cdmt-<name>', ...)` call at module-load time — a real, load-time side effect, not something computed lazily. A consumer doing `import '@codeminity/ui-kit-core'` (the documented usage — no named import, since the whole point is the registration) triggers exactly this side effect and nothing else. `sideEffects: false` told bundlers the opposite was true: with it set, a production build (Vite/Rollup/Webpack, in an actual deployed app, not a dev server which doesn't tree-shake) correctly-per-that-metadata tree-shook the entire import away, since nothing consumed a named export from it — silently deleting the only thing that import was for. This wasn't caught until a real deployed build (not a dev server) was checked; `pnpm dev`/Vite's dev server never tree-shakes, so the bug was invisible until then.

**Decision:** `sideEffects: true`, applying to the whole package, not a per-file array — every component here has this same "import for effect, not for a name" pattern, so there's no meaningful non-side-effecting export to preserve tree-shaking for.

**Consequences:** Consumers get correctly-behaving production builds — the registration always survives tree-shaking. The tradeoff: this package's other exports (types, the `CdmtButton` class itself, if imported by name) also lose whatever marginal tree-shaking benefit `sideEffects: false` would have given them — an acceptable cost given every component's core purpose depends on the side effect surviving.

## ADR-005: Multi-Theme Presets Applied via a Config Engine, Not Hand-Written CSS

**Context:** ADR-003 established CSS custom properties as the token mechanism, but left a real consuming app with only one option: hand-write a `:root { --cdmt-*: ...; }` override block. That doesn't scale to this package's actual goal — multiple distinct, named theme presets (`material` today; `fancy`, `energetic`, ... later) that an end user can switch between at runtime inside a consuming app, with the consuming app still able to tweak a preset's individual values (down to `radiusMd`) without forking it.

Consuming apps also need brand colors (`colorPrimary`, `colorSecondary`, ...) to stay fixed when the user flips between light and dark, while background/surface/border/text colors genuinely change — a hand-written CSS override block has no structure to express that split; it's just flat properties.

**Decision:** A theme is a plain data object (`ThemePreset`: a `tokens` half fixed across color schemes, plus `light`/`dark` halves for what does change), not CSS. Two functions operate on it:

- `applyTheme(target, preset, mode)` — resolves `{ ...preset.tokens, ...preset[mode] }` and imperatively sets each field as a `--cdmt-*` custom property via `target.style.setProperty(...)`. Calling it again (different preset, different mode, or both) re-themes everything already rendered — the runtime-switching case — because components only ever read `var(--cdmt-*)`; they have no idea when or why the value changed.
- `mergeTheme(base, overrides)` — a field-by-field shallow merge across `tokens`/`light`/`dark`, returning a new `ThemePreset`. This is the supported way to customize a shipped preset; a consuming app never writes `--cdmt-*` CSS directly.

Each component's zero-JS default (no `applyTheme` ever called) comes from a per-property `var(--cdmt-*, <material-default>)` fallback at the point of use — see ADR-006 for why the original `theme/tokens.ts` (a blanket `:host { --cdmt-*: <default>; }` block, ADR-003's original mechanism) was removed.

**Consequences:** Adding a new preset (`fancy`, `energetic`, ...) is adding one more `ThemePreset` object under `theme/presets/`, not writing new CSS or touching `applyTheme`/`mergeTheme`. A consuming app's theme-switcher UI, and where the user's choice is persisted, stays entirely the consuming app's concern (unchanged from ADR-003's framing — see [ARCHITECTURE.md](./ARCHITECTURE.md)'s non-goals) — this package only ships the presets and the two functions that resolve them to custom properties. The tradeoff: `ThemeTokens`/`ThemeModeTokens` are a fixed, hand-maintained schema — a component that needs a token neither half currently has requires a schema change here first, not a local workaround in the component.

Per-theme _behavioral_ differences (e.g. a real Material ripple) are explicitly out of scope for this decision — token-level theming (color/radius/shadow/transition) covers everything decided so far; conditional per-theme component logic is a separate, larger decision to make later if a preset's identity genuinely needs it.

## ADR-006: Per-Use-Site `var()` Fallbacks, Not a Blanket `:host` Token Block

**Context:** ADR-003/ADR-005 shipped with `theme/tokens.ts` declaring every default directly on `:host` — e.g. `:host { --cdmt-color-primary: #4f46e5; ... }`. This is a genuine bug, not a style preference: a CSS custom property declared directly on an element (which is what a shadow tree's own `:host { }` rule does, for the host element) always wins over a value the element would otherwise have inherited from an ancestor — inheritance is only a fallback for when the element has **no** declaration of its own, regardless of how weak that declaration's specificity is. Verified in real Chromium (Playwright, not `happy-dom` — see below): with `theme/tokens.ts` in place, `applyTheme(document.documentElement, customTheme)` set `--cdmt-color-primary` correctly on `<html>`, and `getComputedStyle` even confirmed the custom property itself resolved correctly at the button's shadow-root element — but the button's actual rendered `background-color` never changed, because `tokens.ts`'s own `:host` block re-declared the same property with the hardcoded default on every single instance, shadowing the inherited value outright. **The entire theme-switching feature ADR-005 describes was non-functional as shipped.**

The tempting one-line fix — `:host { --cdmt-color-primary: var(--cdmt-color-primary, #4f46e5); }`, a self-referencing `var()` with a fallback — was tested directly in Chromium and does **not** work either: a custom property that references itself (even with a fallback argument) is a cycle per spec, and the property computes to the guaranteed-invalid value at that element, not to the inherited value and not to the fallback.

**Decision:** `theme/tokens.ts` is deleted. Every property that actually reads a token (`background`, `color`, `border-radius`, ...) uses `var(--cdmt-*, <material-default>)` directly at its own point of use — never a separate custom-property re-declaration. A `themeVar(key)` helper (`theme/css-var.ts`) builds this string from `material`'s value so the fallback can't drift from the preset, same single-source-of-truth intent `tokens.ts` originally had.

A second, unrelated bug surfaced by the same verification pass: `<cdmt-button>` had `transition: background-color ...` on the base `button` rule. A CSS `transition` declared on the same property that also derives its value from an inherited custom property permanently freezes that property at its first-computed value in this Chromium version — `applyTheme` re-resolves the underlying custom property correctly (confirmed via `getComputedStyle`'s custom-property read), but the transitioned property itself never re-samples it, even after the transition duration elapses, a forced reflow, or a second unrelated change. The button's `transition` is now scoped to `opacity` only; a var()-driven color property must not also carry a `transition` for that same property.

**How this was caught:** neither bug was caught by `apply-theme.test.ts` (`happy-dom`) — `happy-dom`'s `getComputedStyle` does not resolve CSS custom-property inheritance/`var()` fallbacks the way a real browser does (confirmed directly: a trivial inherited-`var()`-with-fallback case that works correctly in Chromium returns an empty string in `happy-dom`). Both bugs were only found by actually rendering `<cdmt-button>` in a real headless browser and reading its real computed style before and after `applyTheme` — now a permanent regression test at `e2e/apply-theme.spec.ts`, part of the `Browser E2E` full-check stage.

**Consequences:** Any future component consuming a token must call `themeVar(key)` at each property, not assume a `:host` block provides one — CONTRIBUTING.md should be read alongside `button.ts` as the reference shape. Any property that both transitions and derives its value from a token must not transition that same property; pick a different property to animate, or accept an instant change. Verifying theming behavior (this component, and any future one) requires the real-browser e2e suite, not `happy-dom` unit tests — `happy-dom` tests remain useful for everything else (rendering, attributes, events), just not for asserting on resolved custom-property-driven styles.

## ADR-007: Form Components Are Controlled Properties, Sync via Native Composed Events

**Context:** `<cdmt-input>` needs a framework wrapper (starting with `@codeminity/ui-kit-vue`) to be able to bind a live value to it two-way (e.g. Vue's `v-model`) without that wrapper reaching into the shadow DOM or the component shipping any framework-specific API.

**Decision:** `value` is a plain reactive property (`declare value: string`, bound in the template via `.value=${this.value}` — a Lit property binding, not the `value=` attribute binding, since the attribute only sets the initial value and would never reflect what the user typed). The component's own input handler updates `this.value` from the native `<input>` on every keystroke, so the property never goes stale relative to what's rendered — a later re-render (e.g. from an unrelated property change) can't clobber the user's typed text. No custom event is dispatched: the native `input` event a real `<input>` fires is `composed: true` by spec, so it already crosses the shadow DOM boundary — `cdmtInputEl.addEventListener('input', ...)` sees it directly, exactly like listening on a plain `<input>`. Verified directly (not assumed): a real Chromium page confirmed the composed event reaches a listener on the host, typing updates `.value` without corrupting cursor position, and setting `.value` externally updates what's displayed.

**Consequences:** Any future form-like component (textarea, select, checkbox, ...) should follow the same shape: a controlled property kept in sync by the component's own internal listener, native events relied on instead of custom ones wherever the underlying native element already fires the right one. A framework wrapper's whole job becomes "bind the property, listen for the native event, re-emit as that framework's own two-way-binding convention" — e.g. `@codeminity/ui-kit-vue`'s `CdmtInput.vue` maps this to `modelValue`/`update:modelValue`, with no logic of its own beyond that translation.
