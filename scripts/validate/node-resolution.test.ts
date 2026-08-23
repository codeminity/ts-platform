import { describe, expect, it, vi } from 'vitest'

import { runCommand } from '../lib/run-command'

import { validateNodeResolution } from './node-resolution'

import type { globby as Globby } from 'globby'

vi.mock(import('globby'), () => ({
  globby: vi.fn<
    (pattern: string | readonly string[], options?: unknown) => Promise<string[]>
  >() as unknown as typeof Globby
}))

vi.mock(import('../lib/run-command'), () => ({
  runCommand: vi.fn<typeof runCommand>()
}))

const { globby } = await import('globby')

const mockedGlobby = vi.mocked(globby)
const mockedRunCommand = vi.mocked(runCommand)

describe(validateNodeResolution, () => {
  it('skips (returns false) rather than invoking tsc when no package source files exist', async () => {
    mockedGlobby.mockResolvedValue([])

    await expect(validateNodeResolution()).resolves.toBe(false)

    expect(mockedRunCommand).not.toHaveBeenCalled()
  })

  it('runs tsc via pnpm exec and returns true when source files exist', async () => {
    mockedGlobby.mockResolvedValue(['packages/core/src/index.ts'])
    mockedRunCommand.mockResolvedValue(undefined)

    await expect(validateNodeResolution()).resolves.toBe(true)

    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', [
      'exec',
      'tsc',
      '-p',
      'tsconfig.esm-strict.json',
      '--noEmit',
      '--incremental',
      '--tsBuildInfoFile',
      'tsconfig.esm-strict.json.tsbuildinfo'
    ])
  })

  it('propagates a tsc failure', async () => {
    mockedGlobby.mockResolvedValue(['packages/core/src/index.ts'])
    mockedRunCommand.mockRejectedValue(new Error('tsc failed'))

    await expect(validateNodeResolution()).rejects.toThrow('tsc failed')
  })
})
