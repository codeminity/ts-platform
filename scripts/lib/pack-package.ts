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

  return path.join(directory, files[0])
}

export async function packPackage(packagePath: string, outputDir: string): Promise<string> {
  await runCommand('pnpm', ['pack', '--pack-destination', outputDir], {
    cwd: path.resolve(packagePath)
  })

  return findTarball(outputDir)
}
