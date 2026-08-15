import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'vue/index': 'src/vue/index.ts'
  },
  format: ['esm'],
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: true,
  external: ['vue']
})
