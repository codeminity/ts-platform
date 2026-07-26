import fs from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runCommand } from './lib/run-command'
import { validateDocs } from './validate-docs'

vi.mock('globby', () => ({
  globby: vi.fn()
}))

vi.mock('./lib/run-command', () => ({
  runCommand: vi.fn()
}))

const { globby } = await import('globby')

const mockedGlobby = vi.mocked(globby)
const mockedRunCommand = vi.mocked(runCommand)

describe('validateDocs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
  })

  it('throws when no TypeScript code blocks are found', async () => {
    mockedGlobby.mockResolvedValue(['README.md'])
    vi.spyOn(fs, 'readFileSync').mockReturnValue('# No code here')

    await expect(validateDocs()).rejects.toThrow('No TypeScript code blocks were found')

    expect(mockedRunCommand).not.toHaveBeenCalled()
  })

  it('throws when a package has not been built', async () => {
    mockedGlobby.mockResolvedValue(['README.md'])
    vi.spyOn(fs, 'readFileSync').mockReturnValue(['```ts', 'const a = 1', '```'].join('\n'))
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)

    await expect(validateDocs()).rejects.toThrow('run "pnpm build" first')
  })

  it('extracts blocks, writes a temp tsconfig, and runs tsc via pnpm exec', async () => {
    mockedGlobby.mockResolvedValue(['README.md'])
    vi.spyOn(fs, 'readFileSync').mockReturnValue(['```ts', 'const a = 1', '```'].join('\n'))

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
  })

  it('wraps a block with no top-level import/export in export {} to isolate module scope', async () => {
    mockedGlobby.mockResolvedValue(['README.md'])
    vi.spyOn(fs, 'readFileSync').mockReturnValue(['```ts', 'const a = 1', '```'].join('\n'))

    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)

    mockedRunCommand.mockResolvedValue(undefined)

    await validateDocs()

    const blockWrite = writeSpy.mock.calls.find(([file]) => String(file).endsWith('.ts'))

    expect(blockWrite?.[1]).toContain('export {}')
  })

  it('does not add export {} when the block already has an import', async () => {
    mockedGlobby.mockResolvedValue(['README.md'])
    vi.spyOn(fs, 'readFileSync').mockReturnValue(
      ['```ts', "import axios from '@codeminity/axios'", '```'].join('\n')
    )

    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)

    mockedRunCommand.mockResolvedValue(undefined)

    await validateDocs()

    const blockWrite = writeSpy.mock.calls.find(([file]) => String(file).endsWith('.ts'))

    expect(blockWrite?.[1]).not.toContain('export {}')
  })

  it('propagates a tsc failure', async () => {
    mockedGlobby.mockResolvedValue(['README.md'])
    vi.spyOn(fs, 'readFileSync').mockReturnValue(['```ts', 'const a = 1', '```'].join('\n'))
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined)

    mockedRunCommand.mockRejectedValue(new Error('tsc failed'))

    await expect(validateDocs()).rejects.toThrow('tsc failed')
  })
})
