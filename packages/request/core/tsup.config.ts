import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/test-utils.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  sourcemap: true,
  treeshake: true
})
