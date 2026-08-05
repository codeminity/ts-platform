import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { globby } from 'globby'

import { extractTypeScriptBlocks } from './lib/extract-code-blocks'
import { runCommand } from './lib/run-command'

const DOC_GLOBS = ['**/*.md']

// API Extractor reports (etc/*.api.md, temp/*.api.md) are generated snapshots of the
// public API surface, not hand-written doc examples — they aren't meant to be
// validated here (validate:api-exports already covers them).
const DOC_IGNORE = ['**/node_modules/**', '**/dist/**', '**/*.api.md', '**/CHANGELOG.md']

interface ExportTarget {
  types?: string
}

interface PackageManifest {
  name: string
  private?: boolean
  exports?: Record<string, ExportTarget | string>
}

interface WorkspacePackage {
  dir: string
  manifest: PackageManifest
}

async function discoverWorkspacePackages(): Promise<WorkspacePackage[]> {
  const manifestPaths = await globby(['packages/**/package.json'], {
    ignore: ['**/node_modules/**']
  })

  return manifestPaths
    .map((manifestPath) => ({
      dir: path.dirname(manifestPath),
      manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as PackageManifest
    }))
    .filter((pkg) => !pkg.manifest.private)
}

/**
 * Maps every publishable package's import specifiers (`./`, `./test-utils`, ...) to
 * their built `.d.ts` output, so new packages are picked up automatically instead of
 * requiring this script to be edited whenever the workspace grows.
 */
function collectTypesPaths(packages: WorkspacePackage[]): Record<string, string[]> {
  const paths: Record<string, string[]> = {}

  for (const { dir, manifest } of packages) {
    for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
      const types = typeof target === 'string' ? undefined : target.types

      if (!types) continue

      const specifier =
        subpath === '.' ? manifest.name : `${manifest.name}/${subpath.replace(/^\.\//, '')}`

      paths[specifier] = [path.resolve(dir, types)]
    }
  }

  return paths
}

export async function validateDocs(): Promise<void> {
  const workspacePackages = await discoverWorkspacePackages()
  const typesPaths = collectTypesPaths(workspacePackages)

  const files = await globby(DOC_GLOBS, { ignore: DOC_IGNORE })

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-docs-'))

  try {
    let blockCount = 0

    for (const file of files) {
      const markdown = fs.readFileSync(file, 'utf8')
      const blocks = extractTypeScriptBlocks(markdown)

      for (const block of blocks) {
        blockCount += 1

        const safeName = file.replace(/[/\\]/g, '__')

        // A .ts file with no top-level import/export is parsed as a global
        // script, not a module — so unrelated blocks from different guides
        // would otherwise collide in one shared global scope. Force every
        // extracted block to be its own isolated module.
        const isolatedCode = /^\s*(import|export)\b/m.test(block.code)
          ? block.code
          : `${block.code}\nexport {}\n`

        fs.writeFileSync(path.join(tempDir, `${safeName}.L${String(block.line)}.ts`), isolatedCode)
      }
    }

    if (blockCount === 0) {
      throw new Error('No TypeScript code blocks were found to validate')
    }

    for (const [specifier, [typesFile]] of Object.entries(typesPaths)) {
      if (!typesFile || !fs.existsSync(typesFile)) {
        throw new Error(`Missing build output for ${specifier} — run "pnpm build" first`)
      }
    }

    const tsconfig = {
      extends: path.resolve('tsconfig.base.json'),
      compilerOptions: {
        noEmit: true,
        moduleResolution: 'bundler',
        noUnusedLocals: false,
        noUnusedParameters: false,
        types: ['node'],
        typeRoots: [path.resolve('node_modules/@types')],
        paths: typesPaths
      },
      include: ['*.ts']
    }

    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2))

    await runCommand('pnpm', ['exec', 'tsc', '-p', path.join(tempDir, 'tsconfig.json'), '--noEmit'])
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}
