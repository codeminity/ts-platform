# Contributing to @codeminity/ui-kit

## Adding a component

Only when a real consuming app needs it — see [DECISIONS.md#adr-003](./DECISIONS.md#adr-003-demand-driven-component-and-token-growth). To add one:

1. `src/components/<name>/<name>.ts` — a plain Lit `LitElement` subclass. Follow `button.ts`/`input.ts`'s shape:
   - `static override properties = {...}` (plain object, not decorators — see the comment at the top of `button.ts` for why).
   - `declare` fields (no initializer) for every reactive property, set real defaults in the constructor.
   - Every themeable CSS value goes through `themeVar('key')` at its own point of use — see [DECISIONS.md#adr-006](./DECISIONS.md#adr-006-themeable-css-resolves-varcss-at-its-own-point-of-use-never-via-a-blanket-host-re-declaration). Never hardcode a spacing/color/radius/shadow/opacity/border-width literal — if the token you need doesn't exist yet, add it (see "Adding a theme token" below) rather than writing a raw value.
   - If it holds a value (`value`, `checked`, ...), follow [DECISIONS.md#adr-007](./DECISIONS.md#adr-007-form-components-are-controlled-properties-synced-via-native-composed-events) — controlled property, synced via the native composed event, no custom event.
   - `customElements.define('cdmt-<name>', Cdmt<Name>)` at module scope, plus the `HTMLElementTagNameMap` augmentation.
2. `src/components/<name>/<name>.test.ts` — unit tests (`happy-dom`). This repo enforces 100% mutation score (`npx stryker run stryker.config.ts --mutate "packages/ui-kit/src/components/<name>/*.ts,!packages/ui-kit/src/components/<name>/*.test.ts"`) — don't just cover lines, assert every default/branch precisely.
3. `src/components/<name>/CHECKLIST.md` — a plain checklist of implemented vs. known-missing props/events/slots, no external attribution (see ADR-003).
4. Export it from `src/index.ts`.
5. Add real-browser coverage in `e2e/` if it has any themeable/interactive behavior worth verifying beyond what `happy-dom` can (see ADR-006 — `happy-dom` doesn't reliably resolve CSS custom-property inheritance).
6. Add a Vue wrapper in `src/vue/components/<name>/Cdmt<Name>.ts` (see "Adding a framework wrapper" below) if the Vue binding needs it too.

## Adding a framework wrapper (Vue, or a future React/Angular)

The wrapper is a thin translation layer only — see [ARCHITECTURE.md](./ARCHITECTURE.md#where-logic-lives). It should never duplicate logic that already lives in the core component; it only translates a native DOM event into that framework's own idiom. For Vue, follow `CdmtInput.ts`'s shape: `defineComponent` + `h()`, never a `.vue` SFC (keeps this package on the same plain-`tsup` build as everything else — no SFC-compiler tooling needed).

Adding a new framework (React, Angular) means:

1. `src/<framework>/` — mirroring `src/vue/`'s structure.
2. A new `tsup.config.ts` entry (`'<framework>/index': 'src/<framework>/index.ts'`) and a matching `exports["./<framework>"]` in `package.json`.
3. A new `api-extractor.<framework>.json` (API Extractor is one-entry-per-config — see the two existing configs for the pattern).
4. The framework as an optional peer dependency (`peerDependenciesMeta.<framework>.optional: true`).

## Adding a theme token

1. Add the field to `ThemeTokens`/`ThemeColors` in `src/theme/theme.type.ts`, with a doc comment.
2. Add a real default value to `src/theme/presets/material.ts` — every field, no placeholders.
3. If it's a color role, it flows through `flatten-theme-tokens.ts`/`apply-theme.ts`/`css-var.ts` automatically (they walk `ThemeTokens` generically). If it's a new _kind_ of scalar (not a color), add it to `ThemeVarKey` in `css-var.ts` by hand — this is deliberately not auto-derived, so `themeVar()` calls get real compile-time typo-checking.
4. Add it to `ThemePresetOverrides` in `apply-theme.ts` if theme authors should be able to override it via `mergeTheme()`.

## Testing

- Unit (`happy-dom`): `pnpm --filter @codeminity/ui-kit test`. Mutation: `npx stryker run stryker.config.ts --mutate "packages/ui-kit/src/**/*.ts,!packages/ui-kit/src/**/*.test.ts"` (100% required — see the root `DECISIONS.md#adr-007-mutation-testing-scope`).
- e2e (`e2e/*.spec.ts`, real Chromium via Playwright): `npx playwright test --config=e2e/browser/playwright.config.ts packages/ui-kit`. Required for any theming-related change (`happy-dom` doesn't reliably resolve CSS custom-property inheritance — see ADR-006) and for anything crossing a framework wrapper boundary (real `v-model`/event binding, not just a unit-tested translation).
- An e2e fixture that needs to import the package's own built output (mirroring a real consumer) imports from `../dist/...`, not `../src/...` — importing from `src/` bypasses `sideEffects`/tree-shaking checks entirely and would validate a wrong tree-shaking outcome. See ADR-004 for the real bug this exact mistake caused once.
