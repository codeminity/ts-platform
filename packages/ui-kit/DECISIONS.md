# Decisions

Architecture Decision Records for `@codeminity/ui-kit`. Each entry: **Context** (what prompted the decision), **Decision** (what was chosen), **Consequences** (what that costs/buys).

---

## ADR-001: One package with subpath exports, not per-framework packages

**Context:** The framework-agnostic core (Lit components, theming) and each framework binding (Vue, later React/Angular) could each ship as their own separate npm package instead of subpaths of one. That means a full duplicate scaffold per framework — its own `tsconfig`/`tsup`/`api-extractor`/`README`/`DECISIONS`/`CONTRIBUTING` — for what's often a handful of thin wrapper files.

**Decision:** One package, `@codeminity/ui-kit`, with `package.json` `exports` subpaths (`.` for the framework-agnostic core, `./vue` for the Vue binding, `./react`/`./angular` the same way once a real consumer needs them) and a multi-entry `tsup` build. `peerDependenciesMeta` marks each framework peer (`vue`, later `react`, `angular`) `optional: true`.

**Consequences:**

- A consumer only ever downloads/bundles what they import — subpath exports give the exact same tree-shaking outcome as separate packages would, since a bundler never touches an unimported subpath's module graph either way (verified directly: packed the built tarball, installed it in a scratch consumer, and confirmed esbuild produces a 0-byte bundle for an unused subpath — see ADR-004 for the real bug that surfaced doing this).
- Versioning is shared across all frameworks — a React-only change bumps the same version a Vue-only consumer sees. This is normal, accepted npm practice for any multi-export package (e.g. lodash), not a real cost; the changelog documents what actually changed per release.
- Maintenance overhead drops sharply for a small team: one CI pipeline, one release cycle, one set of docs, instead of duplicating all of that per framework.

---

## ADR-002: A stateful `ThemeController` singleton, not a bare `applyTheme()` call

**Context:** The original design was a single function, `applyTheme(target, preset, mode)`, that the caller had to re-invoke with the right `preset`/`mode` every time something changed — meaning the caller had to track "what's the current theme/mode" itself.

**Decision:** `getThemeController()` returns a lazily-created, module-level singleton with `theme`/`mode`/`isDark` state, `setMode()`/`toggleMode()`/`setTheme()` mutators (each re-painting via `applyTheme()` internally), and `subscribe()` for reactive access. It's a plain function — callable from anywhere (a Vue composable, a React hook, a plain script), not gated behind any framework's lifecycle rules.

**Consequences:**

- Mirrors the ergonomics of frameworks that already do this well (e.g. Quasar's `Dark.set()`/`toggle()`), but as this package's own framework-agnostic primitive.
- `'auto'` mode follows `prefers-color-scheme` live via a `matchMedia` listener, set up once (idempotent — calling `setMode('auto')` twice doesn't double-subscribe).
- No `typeof window` guards anywhere in `theme-controller.ts` — this package is Lit-based Web Components, which already require a real DOM to load at all (`customElements.define()` throws immediately in plain Node), so a no-DOM environment structurally can never reach this code. Adding the guard back would be untestable dead code, not real safety.
- `createUIKit()` (the Vue plugin) and `useTheme()` (the Vue composable) are both thin wrappers around this same singleton — Vue-side state and any other access (another framework, a plain script) always agree, because it's the same instance.

---

## ADR-003: Demand-driven component and token growth

**Context:** When building a component that a real consuming app needs (e.g. a form needing input/button), it's tempting to either build the full likely catalog upfront, or build directly in the consuming app and "extract" later. Both were rejected: (a) is speculative work with no real usage to validate the design; (b) doesn't actually work for Web Components — a plain framework component can't be mechanically converted into a shadow-DOM/Lit architecture, it needs a rewrite regardless of which direction it's built first.

**Decision:** Build one real component at a time, only when a concrete consuming app's feature needs it. When building one, keep a `PARITY.md` checklist next to its source — listing implemented and known-missing props/events/slots as a plain checklist, with no external attribution — so the full shape of "what this component could eventually be" is visible without pre-implementing any of it.

**Consequences:** No unused component code, no speculative API surface to maintain or get wrong before a real use case validates it. `PARITY.md` gives a clear, honest "here's what's next" list for whoever picks up that component again.

---

## ADR-004: `sideEffects` must be a glob covering the whole `dist/` output, not exact file paths

**Context:** `customElements.define()` (button/input's registration) is a real load-time side effect that a bundler's tree-shaking must never remove. The first attempt at this package's `package.json` used a precise `sideEffects` array (`["./dist/index.js", "./dist/vue/index.js"]`), assuming this would let purely-functional exports (theme types, utilities) still tree-shake correctly while protecting the two files that register components.

**Decision:** `"sideEffects": ["./dist/**", "./src/index.ts", "./src/vue/index.ts"]` — the whole built output (what a real consumer's bundler checks) plus each entry's own source file (what `tsup`'s own internal esbuild build checks while producing that output).

**Consequences:** The precise-array approach was empirically **wrong** and would have shipped a broken package: `tsup`'s multi-entry ESM build splits shared code (theme + components, imported by both `index.js` and `vue/index.js`) into a separate, content-hashed chunk file (e.g. `dist/chunk-XXXXXX.js`) — which the exact-path `sideEffects` array never covered, since its filename isn't knowable at `package.json`-authoring time. Verified directly: packed the tarball, installed it in a scratch consumer, and bundled a bare `import '@codeminity/ui-kit'` with esbuild — the array version produced a **0-byte output** (the entire package tree-shaken away); the glob version correctly retained both `customElements.define()` calls. A real downstream bundler is the only trustworthy way to check this — `tsup`'s own build warnings are not (they check against the source tree, not the published package's `sideEffects` field against its own dist paths).

The `./src/*.ts` entries exist purely to silence `tsup`'s own build-time warning ("Ignoring this import because ... was marked as having no side effects") for each entry's bare `import '../index.js'` — `src/` is never published (`files: ["dist"]`), so these entries have zero effect on what a real consumer's bundler sees; only the `./dist/**` entry does that job. Re-verified the same way after adding them (0-byte-output check on the packed tarball) — still correctly retained.

---

## ADR-005: Every color role has the same shape — `{ value, onHover, foreground }` per mode — except `text`

**Context:** An earlier design split colors into "brand tokens" (fixed across light/dark) and "mode tokens" (change with light/dark), each color statically assigned to one bucket. This turned out to be too rigid: any named color (even `warning`) might end up used as a button-like background needing its own hover state and contrast-text color, and a color's "fixed vs. variable across modes" behavior should be the _consumer's_ choice, not a structural constraint this package imposes.

**Decision:** `ThemeColor = { light: ColorRole; dark: ColorRole }`, `ColorRole = { value, onHover, foreground }`, applied uniformly to `primary`/`secondary`/`accent`/`background`/`surface`/`border`/`positive`/`negative`/`info`/`warning`. `text` is the one deliberate exception — a plain `{ light: string; dark: string }`, since it isn't a background color anything else is colored with, just the default body text color. `custom` (arbitrary extra named colors) follows the same `ThemeColor` shape.

**Consequences:** A theme author can keep a color identical across modes (same `light`/`dark` values) or let it vary — both are equally supported, nothing is hardcoded either way. Every component author gets a predictable, identical shape for any color role, without needing to check per-role which fields exist.

---

## ADR-006: Themeable CSS resolves `var()` at its own point of use, never via a blanket `:host` re-declaration

**Context:** An earlier version of this theming system declared every default directly on `:host { --cdmt-*: <default>; }`. A `:host` declaration always wins over an _inherited_ custom property value regardless of specificity, so `applyTheme()` had no visible effect — caught by rendering a component in a real browser (`happy-dom` doesn't correctly resolve CSS custom-property inheritance/`var()` fallbacks and would have shipped this silently).

**Decision:** Every themeable CSS property resolves its token via `themeVar('key')` (→ `var(--cdmt-*, <default>)`) at its own point of use in the component's styles — never a blanket per-component default block.

**Consequences:** `applyTheme()`/`getThemeController().setTheme()` genuinely re-theme every component on the page, including ones already rendered. Any theming-related change must be verified in a real browser (Playwright), never trusted from a `happy-dom` unit test alone — see this package's `e2e/` specs.

Also established in this same pass: a CSS `transition` on a property that also derives its value from a `var()` token never re-samples that token in Chromium — components scope their `transition` to `opacity` only, never to a themed color/background property directly.

---

## ADR-007: Form components are controlled properties, synced via native composed events

**Context:** A form component (`<cdmt-input>`) needs a framework wrapper (Vue's `v-model`, React's controlled props) to bind to it without custom per-component glue.

**Decision:** `value` is a controlled property — set externally to update the field, and kept in sync internally as the user types via the component's own input handler. Sync relies on the native `input`/`change` events, which are `composed: true` by spec and cross shadow DOM boundaries automatically — no custom event needed.

**Consequences:** A framework wrapper only needs to translate the native `input` event into that framework's own idiom (Vue: `emit('update:modelValue', ...)`) — no component-specific glue. This is the template for any future value-holding component (textarea, select, checkbox).
