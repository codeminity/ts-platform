import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { globby } from 'globby'

import { extractTypeScriptBlocks } from './lib/extract-code-blocks'
import { runCommand } from './lib/run-command'

const TARGET_GLOBS = ['README.md', 'packages/**/README.md', 'packages/**/docs/guides/*.md']

export async function validateDocs(): Promise<void> {
  const files = await globby(TARGET_GLOBS, { ignore: ['**/node_modules/**'] })

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

    for (const pkg of ['packages/request/core', 'packages/request/axios']) {
      if (!fs.existsSync(path.resolve(pkg, 'dist/index.d.ts'))) {
        throw new Error(`Missing build output for ${pkg} — run "pnpm build" first`)
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
        paths: {
          '@codeminity/request-core': [path.resolve('packages/request/core/dist/index.d.ts')],
          '@codeminity/request-core/test-utils': [
            path.resolve('packages/request/core/dist/test-utils.d.ts')
          ],
          '@codeminity/axios': [path.resolve('packages/request/axios/dist/index.d.ts')]
        }
      },
      include: ['*.ts']
    }

    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2))

    await runCommand('pnpm', ['exec', 'tsc', '-p', path.join(tempDir, 'tsconfig.json'), '--noEmit'])
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}
