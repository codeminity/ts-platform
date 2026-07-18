import fs from 'node:fs'
import path from 'node:path'

export function findWorkspacePackages(packagesDir: string): string[] {
  const packages: string[] = []

  if (!fs.existsSync(packagesDir)) {
    return packages
  }

  function walk(directory: string) {
    const packageJson = path.join(directory, 'package.json')

    if (fs.existsSync(packageJson)) {
      packages.push(directory)
      return
    }

    for (const entry of fs.readdirSync(directory).sort()) {
      const entryPath = path.join(directory, entry)

      if (fs.statSync(entryPath).isDirectory()) {
        walk(entryPath)
      }
    }
  }

  walk(packagesDir)

  return packages
}
