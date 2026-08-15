---
'@codeminity/ui-kit': minor
---

Initial release of `@codeminity/ui-kit`: framework-agnostic UI components (`<cdmt-button>`, `<cdmt-input>`) built with Lit, plus a Vue binding at `@codeminity/ui-kit/vue`.

Theming: `getThemeController()` is a live, stateful singleton (`setMode`/`toggleMode`/`setTheme`/`subscribe`, including a `'auto'` mode that follows `prefers-color-scheme`) rather than a bare function the caller has to re-invoke itself. Colors are organized by role (`primary`/`secondary`/`accent`/`background`/`surface`/`border`/`positive`/`negative`/`info`/`warning`), each with its own `light`/`dark` pair carrying a `value`/`onHover`/`foreground` — plus spacing, radius, shadow, font-weight, line-height, border-width, and focus-ring tokens, so every visual value a component uses is themeable, not just colors. `createUIKit(config)` (a Vue plugin) and `useTheme()` (a Vue composable) apply and reactively expose that same theme state.
