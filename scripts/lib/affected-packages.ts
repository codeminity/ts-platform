import { exec as defaultExec } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

import { findWorkspacePackages } from '../package-discovery'

import { readPackageJson } from './read-package-json'

const execAsync = promisify(defaultExec)

export type ExecFn = (command: string) => Promise<{ stdout: string }>

interface TurboDryRun {
  packages: string[]
}

// Turborepo's own dependency graph, not a raw `git diff` — a package whose
// own source is untouched but that *depends on* something which changed is
// still included (turbo's task-hash inputs are transitive), the same
// correctness guarantee already relied on for `build`/`typecheck` caching.
// This is deliberately not Stryker's own `--incremental` mode: that only
// diffs the mutated file and its test file against a cached report, and by
// its own docs will not detect a change in a *shared* file neither of those
// happens to be — exactly the kind of stale-result risk that matters here.
export async function getAffectedPackageDirs(
  baseRef = 'origin/main',
  packagesDir = 'packages',
  exec: ExecFn = execAsync
): Promise<string[]> {
  const { stdout } = await exec(`pnpm exec turbo run build --filter="...[${baseRef}]" --dry=json`)

  const dryRun = JSON.parse(stdout) as TurboDryRun

  const affectedNames = new Set(dryRun.packages.filter((name) => name !== '//'))
  if (affectedNames.size === 0) return []

  return findWorkspacePackages(packagesDir)
    .filter((packagePath) => affectedNames.has(readPackageJson(packagePath).name))
    .map((packagePath) => packagePath.split(path.sep).join('/'))
}
