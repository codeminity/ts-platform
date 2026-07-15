# @codeminity/axios

## 0.2.0

### 🛠 Improvements

- Skip token refresh entirely when authentication is disabled or no token provider is configured.
- Use `ErrorEventEnum` consistently for emitted lifecycle events.
- Prevent error event callback failures from breaking request error handling flows.
- Fix an infinite recursion issue when using `create()`.
- Scope the refresh queue per Axios instance instead of sharing a global queue.
- Make `shouldRetry` a complete override for retry decisions.
- Merge global retry configuration with per-request retry options.
- Update supported Node.js versions.
- Improve TypeScript configuration and package type boundaries.
- Upgrade project tooling (Turbo, ESLint, TypeScript ESLint, pnpm).

### 🧪 Testing

- Add integration tests covering Axios instance creation.
- Add concurrent token refresh integration coverage.
- Add authentication refresh failure recovery tests.
- Add error event callback isolation tests.
- Improve workspace test isolation.
- Add Vitest coverage support.

### 📚 Documentation

- Expand Axios documentation.
- Add retry architecture decision records (ADRs).
- Improve contribution guidelines with Changeset requirements.

### Patch Changes

- Updated dependencies
  - @codeminity/request-core@0.2.0

## 0.1.1

### 🛠 Improvements

- Update README badge links for the published `@codeminity/axios` package.
- Fix scoped npm badge resolution for package metadata display.

## 0.1.0

### 🚀 Features

- Initial release of @codeminity/axios
- Introduce a production-ready Axios adapter powered by @codeminity/request-core
- Extend Axios with Codeminity lifecycle configuration through the `codeminity` option
- Add TypeScript module augmentation for Axios instance and request configuration
- Integrate Axios interceptors with request lifecycle orchestration
- Add authentication lifecycle support with token retrieval and refresh coordination
- Add concurrent refresh protection through request-core integration
- Add configurable retry orchestration with custom retry strategies
- Add request lifecycle event handling and error callbacks
- Preserve the native Axios API while adding infrastructure-level request capabilities

### 🧪 Testing

- Add full unit test coverage using Vitest
- Cover Axios integration, configuration handling, and lifecycle behavior

### 📚 Documentation

- Add complete package documentation
- Document authentication, retry, events, architecture, and migration patterns
- Add usage examples and API reference
