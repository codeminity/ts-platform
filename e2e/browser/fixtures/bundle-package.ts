import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

/**
 * Bundles a real, already-built `@codeminity/*` package (and its real
 * dependencies) into a single browser-loadable ESM module, the same way a
 * consumer's own bundler (Vite/webpack/esbuild) would. Published packages
 * intentionally ship unbundled ESM with bare specifiers, which only resolves
 * through a bundler or Node — never as a raw browser `<script type="module">`
 * — so this mirrors real downstream consumption rather than testing an
 * artifact shape nobody actually loads directly.
 *
 * @param distEntryUrl - `import.meta.url`-relative URL to the package's built
 * `dist/index.js`, e.g. `new URL('../../../packages/request/axios/dist/index.js', import.meta.url)`.
 */
export async function bundlePackageForBrowser(distEntryUrl: URL): Promise<string> {
  const result = await build({
    entryPoints: [fileURLToPath(distEntryUrl)],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false
  })

  const [output] = result.outputFiles

  if (!output) {
    throw new Error(`esbuild produced no output for ${fileURLToPath(distEntryUrl)}`)
  }

  return output.text
}
