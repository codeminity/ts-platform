import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { packPackage } from './lib/pack-package'
import { readPackageJson } from './lib/read-package-json'
import { findWorkspacePackages } from './package-discovery'
import { verifyPackage } from './verify-package'

async function packWorkspacePackages(
  packages: string[],
  outputDir: string
): Promise<Map<string, string>> {
  // Each package gets its own subdirectory (and its own `pnpm pack` child
  // process) and nothing here reads or writes any other package's state, so
  // packing every package concurrently is safe — not just faster.
  const entries = await Promise.all(
    packages.map(async (packagePath) => {
      const packageJson = readPackageJson(packagePath)

      // findTarball() picks up the first `.tgz` file it finds in a
      // directory, so packing every package into one shared folder risks
      // matching a sibling package's tarball.
      const packageOutputDir = fs.mkdtempSync(path.join(outputDir, 'pkg-'))

      const tarball = await packPackage(packagePath, packageOutputDir)

      return [packageJson.name, tarball] as const
    })
  )

  return new Map(entries)
}

export async function verifyPackages(): Promise<void> {
  const packages = findWorkspacePackages('packages')

  const tarballDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-tarballs-'))

  try {
    // Pack every workspace package up front so internal dependencies
    // (e.g. @codeminity/axios depending on an unreleased @codeminity/request-core)
    // can be resolved from local tarballs instead of the npm registry.
    const localPackages = await packWorkspacePackages(packages, tarballDir)

    // Each verifyPackage() call works entirely inside its own mkdtempSync'd
    // directory (see verify-package.ts) — no shared mutable state between
    // packages, so this scales with package count instead of against it.
    await Promise.all(packages.map((packagePath) => verifyPackage({ packagePath, localPackages })))
  } finally {
    fs.rmSync(tarballDir, {
      recursive: true,
      force: true
    })
  }
}
