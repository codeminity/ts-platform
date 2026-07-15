# @codeminity/request-core

## 0.2.0

### 🛠 Improvements

- Skip the refresh queue when refresh dependencies are not configured.
- Improve refresh lifecycle handling and recovery after failed refresh attempts.
- Prevent refresh failure callbacks from masking the original refresh error.
- Improve package validation by resolving package entry files from the actual package path.
- Standardize package metadata and improve build configuration.
- Add workspace-wide type checking support.
- Update supported Node.js versions.
- Upgrade project tooling (Turbo, ESLint, TypeScript ESLint, pnpm).

### 🧪 Testing

- Add Vitest coverage support.
- Add refresh queue concurrency and failure recovery tests.
- Improve test isolation for workspace environments.
- Add regression coverage for refresh lifecycle behavior.

### 📚 Documentation

- Add Changeset requirements to the contribution workflow.
- Improve project documentation and release guidance.

## 0.1.1

### 🛠 Improvements

- Update @types/node dependency
- Upgrade pnpm version used in CI and release workflows

## 0.1.0

### 🚀 Features

- Initial release of @codeminity/request-core
- Introduce core request orchestration primitives
- Add authentication lifecycle handling (token validation, refresh flow)
- Implement refresh queue for safe concurrent execution
- Add async utilities for deterministic execution flow control
- Establish strict public API surface

### 🧪 Testing

- Add full unit test coverage using Vitest
