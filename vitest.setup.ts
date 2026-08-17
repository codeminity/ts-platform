import { vi } from 'vitest'

// `export {}` makes this a module, not a script — `declare global` is only
// valid from inside a module augmenting the global scope.
export {}

// The affected-scope/scoped-check scripts (lint.ts, typecheck.ts,
// test-mutation.ts, run-if-relevant.ts, affected-scope.ts,
// relevant-changes.ts) print real, user-facing status lines
// ("Typechecking 2 affected package(s)/app(s): ...", "No package/app
// changes since origin/main — skipping lint.", the getAffectedScope/
// hasRelevantChanges fallback warning, ...) — genuinely useful when
// full-check runs for real, pure noise in test output, where every one of
// these functions is already exercised (and its behavior verified) through
// return values and mock call assertions, never by reading what it printed.
// A plain top-level spy here (not wrapped in beforeEach — matches this
// file's own existing style for the Lit dev-mode warning above) applies
// once per test file's setup phase and silences both by default; a test
// that specifically wants to assert a warning was logged still works by
// spying locally in that test (already the established pattern in
// affected-scope.test.ts/relevant-changes.test.ts) — vi.spyOn wraps
// whatever is currently in `console.warn`, so a local mockImplementation
// fully takes over for that call without needing to unwind this one first.
vi.spyOn(console, 'log').mockImplementation(() => {
  /* silence expected status output during tests */
})
vi.spyOn(console, 'warn').mockImplementation(() => {
  /* silence expected fallback warnings during tests */
})

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
