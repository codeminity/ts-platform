---
"@codeminity/axios": patch
"@codeminity/fetch": patch
"@codeminity/request-core": patch
---

Fix relative imports in published type declarations missing explicit `.js` extensions, which silently broke type resolution for consumers using `moduleResolution: "NodeNext"`/`"node16"` (the correct setting for a real Node.js app). A new `pnpm run validate:node-resolution` check (CI-gated) prevents this from regressing.
