import fs from 'node:fs'
import path from 'node:path'

import { runCommand } from './run-command'

export function findTarball(directory: string): string {
  const files = fs.readdirSync(directory).filter((item) => item.endsWith('.tgz'))

  if (files.length === 0) {
    throw new Error(`Package tarball was not generated in ${directory}`)
  }

  if (files.length > 1) {
    throw new Error(
      `Expected exactly one tarball in ${directory}, found ${String(files.length)}: ${files.join(', ')}`
    )
  }

  const [tarball] = files

  /* v8 ignore start -- unreachable: files.length === 1 here, so tarball is always defined; this only satisfies TS's noUncheckedIndexedAccess narrowing */
  if (tarball === undefined) {
    throw new Error(`Package tarball was not generated in ${directory}`)
  }
  /* v8 ignore stop */

  return path.join(directory, tarball)
}

export async function packPackage(packagePath: string, outputDir: string): Promise<string> {
  await runCommand('pnpm', ['pack', '--pack-destination', outputDir], {
    cwd: path.resolve(packagePath)
  })

  return findTarball(outputDir)
}
