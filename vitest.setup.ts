// `export {}` makes this a module, not a script — `declare global` is only
// valid from inside a module augmenting the global scope.
export {}

// Lit's own dev-mode warning gate reads/writes this global but never
// declares its type (it's runtime-only, checked via `grep` against Lit's
// own source — no `.d.ts` anywhere declares it).
declare global {
  var litIssuedWarnings: Set<string> | undefined
}

// Lit prints a one-time "Lit is in dev mode. Not recommended for
// production!" console.warn the first time any LitElement is defined
// outside NODE_ENV=production — genuinely correct default (dev mode enables
// real validity checks worth having during tests), just noisy test output.
// Lit's own warning gate checks `litIssuedWarnings` for either the full
// message or this code before printing (see
// @lit/reactive-element/development/reactive-element.js) — pre-populating
// it suppresses only this one warning, not dev mode itself.
globalThis.litIssuedWarnings ??= new Set()
globalThis.litIssuedWarnings.add('dev-mode')
