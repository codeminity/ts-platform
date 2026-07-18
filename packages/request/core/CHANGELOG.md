# @codeminity/request-core

## 0.4.0

### 🛠 Improvements

- Add automated package verification workflow for all workspace packages.
- Add package discovery support to verify packages dynamically without package-specific configuration.
- Add publint validation to ensure published packages follow npm package best practices.
- Add API Extractor validation to track and validate public package APIs.
- Add tarball verification by packing packages, installing generated artifacts, and validating runtime imports.
- Improve CI and release workflows with package verification gates.
- Improve package boundary validation and publishing confidence.

### 🧪 Testing

- Add verification tests for package discovery, package validation, publint execution, and API validation.
- Improve test coverage enforcement with CI coverage thresholds.
- Add deterministic mocks and isolated verification test flows.
- Validate all workspace packages through automated verification commands.

### 📚 Documentation

- Add package verification guidance to contributing documentation.
- Clarify monorepo package dependency model and public API boundaries.
- Document verification requirements for publishing packages.

## 0.3.0

### 🛠 Improvements

- Update supported Node.js versions to `^22.13.0 || >=24.0.0`.
- Improve TypeScript project structure and shared package boundaries.
- Strengthen package publishing configuration and export validation.
- Improve CI quality gates with dependency auditing and coverage validation.
- Remove obsolete workspace release exclusions.

### 🧪 Testing

- Run code coverage as part of CI and release workflows.
- Improve API validation script with full type safety.
- Improve linting support for workspace scripts without relaxing project rules.

### 📚 Documentation

- Export public configuration types for a more discoverable API.
- Update Node.js version requirements.

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
