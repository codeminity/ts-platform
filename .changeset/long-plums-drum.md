---
"@codeminity/axios": patch
---

Fix a throwing `onEvent` callback suppressing `onError` (and vice versa) during an auth/token-refresh failure. Both callbacks now fail safe independently, matching how every other failure path in this package already behaves.
