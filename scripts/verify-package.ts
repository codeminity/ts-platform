import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { runCommand } from './lib/run-command'

export interface VerifyPackageOptions {
  packagePath: string
}

interface PackageJson {
  name: string
}

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'package-verify-'))
}

function findTarball(directory: string): string {
  const file = fs.readdirSync(directory).find((item) => item.endsWith('.tgz'))

  if (!file) {
    throw new Error('Package tarball was not generated')
  }

  return path.join(directory, file)
}

function readPackageJson(packagePath: string): PackageJson {
  const content = fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8')

  const json: unknown = JSON.parse(content)

  if (
    typeof json !== 'object' ||
    json === null ||
    !('name' in json) ||
    typeof json.name !== 'string'
  ) {
    throw new Error('Invalid package.json')
  }

  return {
    name: json.name
  }
}

async function verifyRuntimeImport(consumerPath: string, packageName: string): Promise<void> {
  const file = path.join(consumerPath, 'index.mjs')

  fs.writeFileSync(
    file,
    `
      import * as pkg from ${JSON.stringify(packageName)}

      if (!pkg) {
        throw new Error('Package import failed')
      }
    `
  )

  await runCommand('node', [file], {
    cwd: consumerPath
  })
}

export async function verifyPackage({ packagePath }: VerifyPackageOptions): Promise<void> {
  const tempDir = createTempDir()

  try {
    const tarballDir = path.join(tempDir, 'tarball')

    const consumerDir = path.join(tempDir, 'consumer')

    fs.mkdirSync(tarballDir)
    fs.mkdirSync(consumerDir)

    const packageJson = readPackageJson(packagePath)

    await runCommand('pnpm', ['pack', '--pack-destination', tarballDir], {
      cwd: path.resolve(packagePath)
    })

    const tarball = findTarball(tarballDir)

    fs.writeFileSync(
      path.join(consumerDir, 'package.json'),
      JSON.stringify(
        {
          name: 'consumer',
          version: '1.0.0',
          type: 'module'
        },
        null,
        2
      )
    )

    await runCommand('pnpm', ['add', tarball], {
      cwd: consumerDir
    })

    await verifyRuntimeImport(consumerDir, packageJson.name)
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true
    })
  }
}
