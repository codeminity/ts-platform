# @codeminity/fetch

## 0.1.0

### Minor Changes

- Initial release of `@codeminity/fetch`: a native Fetch adapter over `@codeminity/request-core`, providing authentication lifecycle handling, refresh-token coordination, retry orchestration, and request lifecycle events — with the exact same call signature and resolve/throw contract as native `fetch` itself (no `.get`/`.post` methods, no throwing on non-2xx responses).

  Proves `@codeminity/request-core`'s transport-agnostic design generalizes beyond Axios: this adapter shares zero transport-specific code with `@codeminity/axios`, only the underlying protocol-agnostic primitives (`handleRefreshToken`, `createRefreshQueue`, `delay`, `dependencies`, `emitterCallback`, `TokenModeEnum`, `AuthConfig`, `RefreshQueue`).

### Patch Changes

- Updated dependencies
  - @codeminity/request-core@0.7.0
