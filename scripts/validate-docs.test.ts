import fs from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runCommand } from './lib/run-command'
import { validateDocs } from './validate-docs'

import type { globby as Globby } from 'globby'

vi.mock(import('globby'), () => ({
  // `globby` is overloaded (an `objectMode`/`stats` options shape resolves
  // to `GlobEntry[]` instead) — only the plain string-array overload is
  // ever used here, so the mock is typed to just that one signature and
  // cast back to the full real type.
  globby: vi.fn<
    (pattern: string | readonly string[], options?: unknown) => Promise<string[]>
  >() as unknown as typeof Globby
}))

vi.mock(import('./lib/run-command'), () => ({
  runCommand: vi.fn<typeof runCommand>()
}))

const { globby } = await import('globby')

const mockedGlobby = vi.mocked(globby)
const mockedRunCommand = vi.mocked(runCommand)

const PACKAGE_MANIFEST = JSON.stringify({
  name: '@codeminity/request-core',
  exports: {
    '.': { types: './dist/index.d.ts' },
    './test-utils': { types: './dist/test-utils.d.ts' }
  }
})

function mockGlobby(
  docFiles: string[],
  manifestFiles: string[] = ['packages/request/core/package.json']
) {
  mockedGlobby.mockImplementation((patterns: unknown) => {
    const list = Array.isArray(patterns) ? patterns : [patterns]
    const isManifestGlob = list.some((pattern) => String(pattern).includes('package.json'))

    return Promise.resolve(isManifestGlob ? manifestFiles : docFiles)
  })
}

function mockReadFile(markdown: string) {
  vi.spyOn(fs, 'readFileSync').mockImplementation((file: unknown) => {
    return String(file).endsWith('package.json') ? PACKAGE_MANIFEST : markdown
  })
}

describe('validateDocs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
  })

  it('throws when no TypeScript code blocks are found', async () => {
    mockGlobby(['README.md'])
    mockReadFile('# No code here')

    await expect(validateDocs()).rejects.toThrow('No TypeScript code blocks were found')

    expect(mockedRunCommand).not.toHaveBeenCalled()
  })

  it('throws when a discovered package has not been built', async () => {
    mockGlobby(['README.md'])
    mockReadFile(['```ts', 'const a = 1', '```'].join('\n'))
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)

    await expect(validateDocs()).rejects.toThrow(
      'Missing build output for @codeminity/request-core — run "pnpm build" first'
    )
  })

  it('skips packages with no exports map instead of failing', async () => {
    mockGlobby(['README.md'], ['packages/request/core/package.json'])
    vi.spyOn(fs, 'readFileSync').mockImplementation((file: unknown) => {
      if (String(file).endsWith('package.json')) {
        return JSON.stringify({ name: '@codeminity/no-exports' })
      }

      return ['```ts', 'const a = 1', '```'].join('\n')
    })

    mockedRunCommand.mockResolvedValue(undefined)

    await expect(validateDocs()).resolves.toBeUndefined()
  })

  it('skips a string-shorthand export entry (no types field to type-check against)', async () => {
    mockGlobby(['README.md'], ['packages/legacy/package.json'])
    vi.spyOn(fs, 'readFileSync').mockImplementation((file: unknown) => {
      if (String(file).endsWith('package.json')) {
        return JSON.stringify({
          name: '@codeminity/legacy',
          exports: { '.': './dist/index.js' }
        })
      }

      return ['```ts', 'const a = 1', '```'].join('\n')
    })

    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)
    mockedRunCommand.mockResolvedValue(undefined)

    await expect(validateDocs()).resolves.toBeUndefined()

    const tsconfigWrite = writeSpy.mock.calls.find(([file]) =>
      String(file).endsWith('tsconfig.json')
    )
    const tsconfigContent = tsconfigWrite?.[1]
    const tsconfig = JSON.parse(typeof tsconfigContent === 'string' ? tsconfigContent : '') as {
      compilerOptions: { paths: Record<string, string[]> }
    }

    expect(tsconfig.compilerOptions.paths).toStrictEqual({})
  })

  it('ignores private packages when building the paths map', async () => {
    mockGlobby(['README.md'], ['packages/internal/package.json'])
    vi.spyOn(fs, 'readFileSync').mockImplementation((file: unknown) => {
      if (String(file).endsWith('package.json')) {
        return JSON.stringify({
          name: '@codeminity/internal',
          private: true,
          exports: { '.': { types: './dist/index.d.ts' } }
        })
      }

      return ['```ts', 'const a = 1', '```'].join('\n')
    })

    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    mockedRunCommand.mockResolvedValue(undefined)

    await expect(validateDocs()).resolves.toBeUndefined()
  })

  it('extracts blocks, writes a temp tsconfig with dynamic paths, and runs tsc via pnpm exec', async () => {
    mockGlobby(['README.md'])
    mockReadFile(['```ts', 'const a = 1', '```'].join('\n'))

    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)

    mockedRunCommand.mockResolvedValue(undefined)

    await expect(validateDocs()).resolves.toBeUndefined()

    expect(mockedRunCommand).toHaveBeenCalledWith(
      'pnpm',
      expect.arrayContaining(['exec', 'tsc', '-p'])
    )

    const tsconfigWrite = writeSpy.mock.calls.find(([file]) =>
      String(file).endsWith('tsconfig.json')
    )

    expect(tsconfigWrite).toBeDefined()

    const tsconfigContent = tsconfigWrite?.[1]
    const tsconfig = JSON.parse(typeof tsconfigContent === 'string' ? tsconfigContent : '') as {
      compilerOptions: { paths: Record<string, string[]> }
    }

    expect(Object.keys(tsconfig.compilerOptions.paths)).toStrictEqual([
      '@codeminity/request-core',
      '@codeminity/request-core/test-utils'
    ])
  })

  it('wraps a block with no top-level import/export in export {} to isolate module scope', async () => {
    mockGlobby(['README.md'])
    mockReadFile(['```ts', 'const a = 1', '```'].join('\n'))

    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)

    mockedRunCommand.mockResolvedValue(undefined)

    await validateDocs()

    const blockWrite = writeSpy.mock.calls.find(([file]) => String(file).endsWith('.ts'))

    expect(blockWrite?.[1]).toContain('export {}')
  })

  it('does not add export {} when the block already has an import', async () => {
    mockGlobby(['README.md'])
    mockReadFile(['```ts', "import axios from '@codeminity/axios'", '```'].join('\n'))

    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)

    mockedRunCommand.mockResolvedValue(undefined)

    await validateDocs()

    const blockWrite = writeSpy.mock.calls.find(([file]) => String(file).endsWith('.ts'))

    expect(blockWrite?.[1]).not.toContain('export {}')
  })

  it('propagates a tsc failure', async () => {
    mockGlobby(['README.md'])
    mockReadFile(['```ts', 'const a = 1', '```'].join('\n'))
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)

    mockedRunCommand.mockRejectedValue(new Error('tsc failed'))

    await expect(validateDocs()).rejects.toThrow('tsc failed')
  })
})
