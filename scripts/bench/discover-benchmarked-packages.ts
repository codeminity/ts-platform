import fs from 'node:fs'
import path from 'node:path'

import { findWorkspacePackages } from '../lib/package-discovery.js'

export interface BenchmarkedPackage {
  name: string
  dir: string
  benchDir: string
}

/**
 * Finds every workspace package that has its own `bench/` directory —
 * deliberately not a hardcoded package list, so a package that gains
 * benchmarks later (or one that hasn't published its first release yet,
 * like `@codeminity/ui-kit` at the time this was written) is picked up
 * automatically with no config edit.
 *
 * @public
 */
export function discoverBenchmarkedPackages(packagesRoot: string): BenchmarkedPackage[] {
  const result: BenchmarkedPackage[] = []

  for (const dir of findWorkspacePackages(packagesRoot)) {
    const benchDir = path.join(dir, 'bench')

    if (!fs.existsSync(benchDir)) continue

    const packageJson = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) as {
      name: string
    }

    result.push({ name: packageJson.name, dir, benchDir })
  }

  return result.sort((a, b) => a.name.localeCompare(b.name))
}
