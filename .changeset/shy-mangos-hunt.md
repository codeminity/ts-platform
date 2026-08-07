---
"@codeminity/axios": patch
"@codeminity/fetch": patch
---

Fix the insecure-URL warning never firing for a relative URL/path — the most common usage pattern in a browser SPA (`baseURL`/`document.baseURI` was previously never resolved against, so `new URL('/orders')` threw and the check silently no-opped). Relative URLs now resolve against the configured `baseURL` (axios) or `document.baseURI` (both, in a browser) before being checked, matching how the request is actually dispatched.
