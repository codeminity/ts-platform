# Compatibility

What every package in this repo (`@codeminity/axios`, `@codeminity/fetch`, `@codeminity/request-core`) is actually verified against — not just "should probably work."

For which application frameworks have a real, working example built on top of these packages, see [`ts-platform-examples`'s COMPATIBILITY.md](https://github.com/codeminity/ts-platform-examples/blob/main/COMPATIBILITY.md) — that's proof-by-working-app, this document is proof-by-CI.

---

## Node.js

| Version       | Supported |
| ------------- | --------- |
| `^22.13.0`    | ✅        |
| `>=24.0.0`    | ✅        |
| anything else | ❌        |

Enforced by each package's own `engines.node` and tested in CI across both ranges (`ci.yml`'s matrix), on Ubuntu, Windows, and macOS.

---

## Module System

**ESM only.** Every package ships `"type": "module"` with a single `import` condition in `exports` — there is no CommonJS build and none is planned. `require('@codeminity/axios')` will not work; use `import` (or a dynamic `import()` from CommonJS code).

---

## TypeScript

No hard-pinned `typescript` peer dependency, but written against and tested with strict mode. Recommended minimum:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

---

## Browsers

Only `@codeminity/axios` and `@codeminity/fetch` have browser-specific behavior (`COOKIE` token mode, cross-origin credentialed requests) — `@codeminity/request-core` has no browser-specific code path to test.

| Browser                   | Verified how                                                | Status |
| ------------------------- | ----------------------------------------------------------- | ------ |
| Chromium (Desktop Chrome) | Real-browser Playwright e2e (`e2e/browser/`, not simulated) | ✅     |
| Firefox                   | Not tested                                                  | ❓     |
| WebKit / Safari           | Not tested                                                  | ❓     |

Chosen over `happy-dom`/`jsdom` specifically because neither implements a real cookie jar or same-origin policy — see [DECISIONS.md](./DECISIONS.md#real-browser-testing-over-dom-simulation). Firefox/WebKit coverage is a real gap, not a claim of incompatibility — add a project to [`playwright.config.ts`](./e2e/browser/playwright.config.ts) and this table changes, not before.

---

## Bundlers

No bundler-specific code or workarounds. Each package is a single ESM entry point (`sideEffects: false`, no deep imports possible — only `exports`-declared paths resolve), which every modern bundler (Vite, esbuild, Rollup, webpack 5+) handles identically: clean tree-shaking, no CJS/ESM interop shims needed on the consumer side.

| Bundler    | Status                                                      |
| ---------- | ----------------------------------------------------------- |
| Vite       | ✅ (used by `tsup`/Vitest internally; no known issues)      |
| esbuild    | ✅ (used by `tsup` to build these packages themselves)      |
| Rollup     | ✅ (no known issues; not separately CI-tested)              |
| webpack 5+ | ✅ (no known issues; not separately CI-tested)              |
| webpack 4  | ❓ (predates widespread ESM-only package support; untested) |

---

## Frameworks

Not this repo's concern by design — see [ARCHITECTURE.md](./ARCHITECTURE.md) and [ROADMAP.md](./ROADMAP.md): these packages are framework-agnostic infrastructure, not framework integrations. Real, working framework examples live in [`ts-platform-examples`](https://github.com/codeminity/ts-platform-examples) instead, growing as apps are added there.
