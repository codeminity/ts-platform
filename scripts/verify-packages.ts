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
  const localPackages = new Map<string, string>()

  for (const packagePath of packages) {
    const packageJson = readPackageJson(packagePath)

    // Each package gets its own subdirectory: findTarball() picks up the
    // first `.tgz` file it finds in a directory, so packing every package
    // into one shared folder risks matching a sibling package's tarball.
    const packageOutputDir = fs.mkdtempSync(path.join(outputDir, 'pkg-'))

    const tarball = await packPackage(packagePath, packageOutputDir)

    localPackages.set(packageJson.name, tarball)
  }

  return localPackages
}

export async function verifyPackages(): Promise<void> {
  const packages = findWorkspacePackages('packages')

  const tarballDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-tarballs-'))

  try {
    // Pack every workspace package up front so internal dependencies
    // (e.g. @codeminity/axios depending on an unreleased @codeminity/request-core)
    // can be resolved from local tarballs instead of the npm registry.
    const localPackages = await packWorkspacePackages(packages, tarballDir)

    for (const packagePath of packages) {
      await verifyPackage({ packagePath, localPackages })
    }
  } finally {
    fs.rmSync(tarballDir, {
      recursive: true,
      force: true
    })
  }
}
