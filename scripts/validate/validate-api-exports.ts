import fs from 'node:fs'
import path from 'node:path'

import { globby } from 'globby'

import { extractExportsFromSource, hasTypeExport } from '../lib/api-exports'
import { loadRuntimeModule } from '../lib/load-runtime-module'

// A cheap, textual sanity check — does every export named in src/ actually
// show up in the built dist/*.js and dist/*.d.ts? It does NOT run API
// Extractor (no TSDoc/release-tag enforcement, no etc/*.api.md diff check)
// — that's verify-package.ts's job, via lib/run-api-extractor.ts, wired
// into `pnpm run verify:packages`.
//
// Walks every subpath in the package's own `exports` map (not just ".")
// so a multi-entry package (e.g. `@codeminity/ui-kit`'s "." and "./vue")
// gets every entry point validated, not just the first.

interface ExportTarget {
  types?: string
  import?: string
}

interface PackageJson {
  name?: string
  version?: string
  exports?: Record<string, ExportTarget | string>
  types?: string
  main?: string
  module?: string
}

function resolveEntrySource(importRelativePath: string): string {
  // "./dist/vue/index.js" -> "src/vue/index.ts" — the built output always
  // mirrors the source tree one-to-one under this repo's tsup convention.
  return importRelativePath.replace(/^\.\/dist\//, 'src/').replace(/\.js$/, '.ts')
}

export async function validatePackages() {
  const validatedPackages: string[] = []

  const packages = await globby('packages/**/package.json', {
    ignore: ['**/node_modules/**']
  })

  for (const pkgFile of packages) {
    const pkgPath = path.dirname(pkgFile)

    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8')) as PackageJson

    const packageName = pkg.name ?? 'not_found'

    const exportsMap: Record<string, ExportTarget | string> = pkg.exports ?? {
      '.': { types: './dist/index.d.ts', import: './dist/index.js' }
    }

    for (const [subpath, target] of Object.entries(exportsMap)) {
      const importRelativePath = typeof target === 'string' ? target : target.import
      const typesRelativePath = typeof target === 'string' ? undefined : target.types

      if (!importRelativePath) continue

      const label = subpath === '.' ? packageName : `${packageName}/${subpath.replace(/^\.\//, '')}`

      const distPath = path.resolve(pkgPath, importRelativePath)
      const typesPath = typesRelativePath ? path.resolve(pkgPath, typesRelativePath) : undefined

      if (!fs.existsSync(distPath)) {
        throw new Error(`Missing build output: ${label}`)
      }

      const expected = extractExportsFromSource(pkgPath, resolveEntrySource(importRelativePath))

      const runtime = await loadRuntimeModule(distPath)

      for (const name of expected.runtime) {
        if (!(name in runtime)) {
          throw new Error(`Missing runtime export ${name} in ${label}`)
        }
      }

      if (typesPath && fs.existsSync(typesPath)) {
        const dts = fs.readFileSync(typesPath, 'utf8')

        for (const name of expected.types) {
          if (!hasTypeExport(dts, name)) {
            throw new Error(`Missing type export ${name} in ${label}`)
          }
        }
      }

      validatedPackages.push(label)
    }
  }

  return validatedPackages
}
