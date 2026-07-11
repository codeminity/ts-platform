# @codeminity/axios

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
