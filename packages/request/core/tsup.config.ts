import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/test-utils.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // test-utils.ts's mocks import `vi` from vitest — without this, tsup bundles
  // vitest (and its own deps, e.g. magic-string) straight into the published
  // package. Consumers of `@codeminity/request-core/test-utils` already have
  // vitest as their own devDependency (that's the whole point of a test
  // utility), so it must resolve from there, not ship as bundled/duplicated
  // code — a second, bundled `vi` instance risks not being recognized as the
  // same mock implementation by the consumer's own vitest runtime.
  external: ['vitest']
})
