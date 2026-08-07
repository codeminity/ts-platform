---
"@codeminity/request-core": patch
---

Fix `delay()` never removing its own `abort` listener when the signal actually aborts (only the normal timer-fires path cleaned up). A given `AbortSignal` only fires `abort` once, so this couldn't accumulate unbounded listeners in practice, but the cleanup is now symmetric on both paths.
