---
'@codeminity/request-core': patch
---

Widen the optional `vitest` peer dependency range to `^4.0.0 || ^5.0.0` — `test-utils` doesn't call anything version-specific, so consumers on either major now resolve correctly instead of npm/pnpm reporting an unmet peer once they upgrade past `vitest@5.0.0`.
