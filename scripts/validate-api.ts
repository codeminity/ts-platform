import fs from 'node:fs'
import path from 'node:path'

import { globby } from 'globby'

import { extractExportsFromSource, hasTypeExport } from './lib/api-exports'
import { loadRuntimeModule } from './lib/load-runtime-module'

export async function validatePackages() {
  const validatedPackages: string[] = []

  const packages = await globby('packages/**/package.json', {
    ignore: ['**/node_modules/**']
  })

  interface PackageJson {
    name?: string
    version?: string
    exports?: Record<string, unknown>
    types?: string
    main?: string
    module?: string
  }

  for (const pkgFile of packages) {
    const pkgPath = path.dirname(pkgFile)

    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8')) as PackageJson

    const packageName = pkg.name ?? 'not_found'

    const distPath = path.resolve(pkgPath, 'dist/index.js')

    const typesPath = path.resolve(pkgPath, 'dist/index.d.ts')

    if (!fs.existsSync(distPath)) {
      throw new Error(`Missing build output: ${packageName}`)
    }

    const expected = extractExportsFromSource(pkgPath)

    const runtime = await loadRuntimeModule(distPath)

    for (const name of expected.runtime) {
      if (!(name in runtime)) {
        throw new Error(`Missing runtime export ${name} in ${packageName}`)
      }
    }

    if (fs.existsSync(typesPath)) {
      const dts = fs.readFileSync(typesPath, 'utf8')

      for (const name of expected.types) {
        if (!hasTypeExport(dts, name)) {
          throw new Error(`Missing type export ${name} in ${packageName}`)
        }
      }
    }

    validatedPackages.push(packageName)
  }

  return validatedPackages
}
