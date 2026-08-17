import { describe, expect, it, vi } from 'vitest'

import { runCommand } from './lib/run-command'

vi.mock('globby', () => ({
  globby: vi.fn()
}))

vi.mock('./lib/run-command', () => ({
  runCommand: vi.fn()
}))

const { globby } = await import('globby')
const { findExtraTsconfigs, typecheckExtras } = await import('./typecheck-extras')

const mockedGlobby = vi.mocked(globby)
const mockedRunCommand = vi.mocked(runCommand)

describe('findExtraTsconfigs', () => {
  it('combines the fixed tsconfigs with discovered per-package e2e and bench tsconfigs', async () => {
    mockedGlobby.mockImplementation((pattern) =>
      Promise.resolve(
        pattern === 'packages/**/e2e/tsconfig.json'
          ? ['packages/request/fetch/e2e/tsconfig.json', 'packages/request/axios/e2e/tsconfig.json']
          : ['packages/request/core/bench/tsconfig.json']
      )
    )

    const result = await findExtraTsconfigs()

    expect(mockedGlobby).toHaveBeenCalledWith('packages/**/e2e/tsconfig.json', {
      ignore: ['**/node_modules/**']
    })
    expect(mockedGlobby).toHaveBeenCalledWith('packages/**/bench/tsconfig.json', {
      ignore: ['**/node_modules/**']
    })
    expect(result).toEqual([
      'e2e/tsconfig.json',
      'packages/request/axios/e2e/tsconfig.json',
      'packages/request/core/bench/tsconfig.json',
      'packages/request/fetch/e2e/tsconfig.json',
      'scripts/tsconfig.json',
      'tsconfig.tooling.json'
    ])
  })

  it('returns just the fixed tsconfigs when no package has an e2e or bench folder', async () => {
    mockedGlobby.mockResolvedValue([])

    const result = await findExtraTsconfigs()

    expect(result).toEqual(['e2e/tsconfig.json', 'scripts/tsconfig.json', 'tsconfig.tooling.json'])
  })
})

describe('typecheckExtras', () => {
  it('runs tsc for every discovered tsconfig', async () => {
    mockedGlobby.mockImplementation((pattern) =>
      Promise.resolve(
        pattern === 'packages/**/e2e/tsconfig.json'
          ? ['packages/request/axios/e2e/tsconfig.json']
          : []
      )
    )
    mockedRunCommand.mockResolvedValue(undefined)

    const onProgress = vi.fn()

    await typecheckExtras(onProgress)

    expect(mockedRunCommand).toHaveBeenCalledTimes(4)
    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', [
      'exec',
      'tsc',
      '-p',
      'packages/request/axios/e2e/tsconfig.json',
      '--noEmit',
      '--incremental',
      '--tsBuildInfoFile',
      'packages/request/axios/e2e/tsconfig.json.tsbuildinfo'
    ])
    expect(onProgress).toHaveBeenCalledTimes(4)
    expect(onProgress).toHaveBeenCalledWith('packages/request/axios/e2e/tsconfig.json')
  })

  it('does not require an onProgress callback', async () => {
    mockedGlobby.mockResolvedValue([])
    mockedRunCommand.mockResolvedValue(undefined)

    await expect(typecheckExtras()).resolves.toBeUndefined()
  })

  it('propagates a tsc failure', async () => {
    mockedGlobby.mockResolvedValue([])
    mockedRunCommand.mockRejectedValue(new Error('type error'))

    await expect(typecheckExtras()).rejects.toThrow('type error')
  })

  it('starts every tsconfig without waiting for an earlier one to finish', async () => {
    mockedGlobby.mockImplementation((pattern) =>
      Promise.resolve(
        pattern === 'packages/**/e2e/tsconfig.json'
          ? ['packages/request/axios/e2e/tsconfig.json']
          : []
      )
    )

    const started: string[] = []
    let resolveScripts: () => void = () => {
      /* empty */
    }
    const scriptsGate = new Promise<void>((resolve) => {
      resolveScripts = resolve
    })

    mockedRunCommand.mockImplementation((_command, args) => {
      const tsconfig = args?.[3]
      if (tsconfig) started.push(tsconfig)
      return tsconfig === 'scripts/tsconfig.json' ? scriptsGate : Promise.resolve()
    })

    const resultPromise = typecheckExtras()

    // e2e/axios's own tsc invocation has no reason to wait for
    // scripts/tsconfig.json's — both should have started even though
    // scripts/tsconfig.json's own runCommand promise is still pending.
    await vi.waitFor(() => {
      expect(started).toContain('scripts/tsconfig.json')
      expect(started).toContain('packages/request/axios/e2e/tsconfig.json')
    })

    resolveScripts()
    await resultPromise
  })
})
