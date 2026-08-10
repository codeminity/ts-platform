import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import { buildLocalOverrides, toWorkspaceOverridesYaml } from './lib/local-overrides'
import { packPackage } from './lib/pack-package'
import { readPackageJson } from './lib/read-package-json'
import { runApiExtractor } from './lib/run-api-extractor'
import { runCommand } from './lib/run-command'
import { runPublint } from './lib/run-publint'

export interface VerifyPackageOptions {
  packagePath: string
  /**
   * Map of workspace package name -> already-packed tarball path.
   * When provided, any of these packages found as (transitive) dependencies
   * of the package under verification are resolved from their local tarball
   * instead of the npm registry, so unreleased versions can be verified
   * entirely locally. Passed in by `verifyPackages` when verifying the
   * whole workspace; omitted when verifying a single package in isolation.
   */
  localPackages?: Map<string, string>
}

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'package-verify-'))
}

// The `ui-kit` category's packages are Web Components — Lit's LitElement
// base class and customElements.define() reference HTMLElement/customElements
// at module-load time, which throws in plain Node with no DOM. Every other
// category's packages have no such requirement, so this is scoped to
// `ui-kit` specifically rather than registering DOM globals unconditionally.
function needsDomGlobals(packagePath: string): boolean {
  return packagePath.split(path.sep).includes('ui-kit')
}

export function readVersionFromPackageJson(packageJsonPath: string): string {
  const json: unknown = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

  if (typeof json !== 'object' || json === null || !('version' in json)) {
    throw new Error(`Could not read version from ${packageJsonPath}`)
  }

  return String(json.version)
}

// Pins the scratch consumer's install to exactly what's installed here,
// rather than letting `pnpm add` resolve whatever "latest" happens to be at
// verification time.
function getInstalledVersion(packageName: string): string {
  const require = createRequire(import.meta.url)

  return readVersionFromPackageJson(require.resolve(`${packageName}/package.json`))
}

async function verifyRuntimeImport(
  consumerPath: string,
  packageName: string,
  domGlobals: boolean
): Promise<void> {
  const file = path.join(consumerPath, 'index.mjs')

  fs.writeFileSync(
    file,
    `
      ${domGlobals ? "import '@happy-dom/global-registrator/register.js'\n" : ''}
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

export async function verifyPackage({
  packagePath,
  localPackages
}: VerifyPackageOptions): Promise<void> {
  const tempDir = createTempDir()

  try {
    const tarballDir = path.join(tempDir, 'tarball')

    const consumerDir = path.join(tempDir, 'consumer')

    fs.mkdirSync(tarballDir)
    fs.mkdirSync(consumerDir)

    const packageJson = readPackageJson(packagePath)

    const tarball =
      localPackages?.get(packageJson.name) ?? (await packPackage(packagePath, tarballDir))

    const overrides = buildLocalOverrides(packageJson.name, localPackages)

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

    if (overrides) {
      fs.writeFileSync(
        path.join(consumerDir, 'pnpm-workspace.yaml'),
        toWorkspaceOverridesYaml(overrides)
      )
    }

    const domGlobals = needsDomGlobals(packagePath)

    const addArgs = domGlobals
      ? [
          'add',
          tarball,
          `@happy-dom/global-registrator@${getInstalledVersion('@happy-dom/global-registrator')}`
        ]
      : ['add', tarball]

    await runCommand('pnpm', addArgs, {
      cwd: consumerDir
    })

    await verifyRuntimeImport(consumerDir, packageJson.name, domGlobals)
    await runPublint(path.resolve(packagePath))
    await runApiExtractor(path.resolve(packagePath))
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true
    })
  }
}
