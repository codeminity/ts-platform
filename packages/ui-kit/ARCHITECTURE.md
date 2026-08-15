# Architecture

## Layout

```
src/
  index.ts                — public API for the "." entry
  components/
    button/button.ts       — <cdmt-button>, plain Lit Custom Element
    button/PARITY.md        — feature checklist, updated as the component grows
    input/input.ts          — <cdmt-input>
    input/PARITY.md
  theme/
    theme.type.ts           — ThemeTokens/ThemeColors/ColorRole/ThemePreset types
    presets/material.ts      — the material theme preset
    css-custom-property-name.ts — camelCase flat key -> --cdmt-* CSS var name
    flatten-theme-tokens.ts  — ThemeTokens -> flat { cssVarKey: value } for a mode
    css-var.ts               — themeVar(), used inside component styles
    apply-theme.ts           — applyTheme(), mergeTheme(), ThemePresetOverrides
    theme-controller.ts      — getThemeController(), the stateful theme singleton
  vue/
    index.ts                — public API for the "./vue" entry
    components/              — Vue wrapper components (thin — see ADR-002)
    create-ui-kit.ts         — createUIKit(), a Vue plugin for initial theme setup
    use-theme.ts             — useTheme(), a reactive wrapper around theme-controller
e2e/                         — real-browser (Playwright) specs
```

## One package, two entry points

`@codeminity/ui-kit` ships both the framework-agnostic core (`.`) and a Vue binding (`./vue`) from the same package, via `package.json`'s `exports` map and a multi-entry `tsup` build. See [DECISIONS.md#adr-001](./DECISIONS.md#adr-001-one-package-with-subpath-exports-not-per-framework-packages) for why, and for what changes when a `./react`/`./angular` entry gets added.

## Where logic lives

All real logic — controlled properties, native composed events, theming — lives in the framework-agnostic core (`components/`, `theme/`). Framework bindings (`vue/`) are thin translation layers only: they wire a native DOM event to that framework's own idiom (`update:modelValue` for Vue) and nothing more. A new framework binding (React, Angular) should follow the same shape — see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Theming pipeline

1. `theme.type.ts` defines the shape: `ThemeTokens` (`colors` + scalar tokens like spacing/radius/shadow), `ThemeColors` (10 named roles, each a `{ light, dark }` pair of `{ value, onHover, foreground }`), plus `text` as the one non-role exception.
2. `flatten-theme-tokens.ts` walks a `ThemeTokens` object for a given mode and produces a flat `{ colorPrimary: '...', colorPrimaryHover: '...', spacingMd: '...', ... }` map — the single source of truth both `applyTheme()` (painting) and `css-var.ts` (fallback defaults) read from, so they can never drift apart.
3. `apply-theme.ts`'s `applyTheme(target, preset, mode)` paints that flat map onto `target.style` as `--cdmt-*` custom properties. `mergeTheme(base, overrides)` deep-merges a `ThemePresetOverrides` object onto a base preset, per role/mode/field.
4. `css-var.ts`'s `themeVar(key)` is what component styles actually call — returns `var(--cdmt-<key>, <material-light-default>)`, so every component renders correctly even if theming is never set up at all.
5. `theme-controller.ts`'s `getThemeController()` is the live, stateful layer on top of `applyTheme` — see [DECISIONS.md#adr-002](./DECISIONS.md#adr-002-a-stateful-thememcontroller-singleton-not-a-bare-applytheme-call).

## Non-goals

- No CSS framework, no utility classes — only the `--cdmt-*` custom-property surface.
- No speculative components or tokens — see [DECISIONS.md#adr-003](./DECISIONS.md#adr-003-demand-driven-component-and-token-growth).
- No gradient support for `foreground`/`border` roles yet — deferred, needs its own design pass (the `background-clip: text` technique works for text but not cleanly for borders).
