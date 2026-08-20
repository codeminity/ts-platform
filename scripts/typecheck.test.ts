import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { getAffectedScope as GetAffectedScope } from './lib/affected-scope'
import type { runCommand as RunCommand } from './lib/run-command'

vi.mock(import('./lib/affected-scope'), () => ({
  getAffectedScope: vi.fn<typeof GetAffectedScope>()
}))
vi.mock(import('./lib/run-command'), () => ({ runCommand: vi.fn<typeof RunCommand>() }))

const { getAffectedScope } = await import('./lib/affected-scope')
const { runCommand } = await import('./lib/run-command')
const { runScopedTypecheck } = await import('./typecheck')

const mockedGetAffectedScope = vi.mocked(getAffectedScope)
const mockedRunCommand = vi.mocked(runCommand)

describe('runScopedTypecheck', () => {
  beforeEach(() => {
    mockedGetAffectedScope.mockReset()
    mockedRunCommand.mockReset()
  })

  it('runs the full typecheck command when the scope is full', async () => {
    mockedGetAffectedScope.mockResolvedValue({ type: 'full' })
    mockedRunCommand.mockResolvedValue(undefined)

    await runScopedTypecheck()

    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['run', 'typecheck:full'], {})
    expect(mockedRunCommand).toHaveBeenCalledTimes(1)
  })

  it('skips typecheck entirely when nothing is affected', async () => {
    mockedGetAffectedScope.mockResolvedValue({ type: 'scoped', packageDirs: [], appDirs: [] })

    await runScopedTypecheck()

    expect(mockedRunCommand).not.toHaveBeenCalled()
  })

  it('runs turbo scoped to affected packages and apps, then always runs the extras check', async () => {
    mockedGetAffectedScope.mockResolvedValue({
      type: 'scoped',
      packageDirs: ['packages/ui-kit'],
      appDirs: ['apps/ui-kit-docs']
    })
    mockedRunCommand.mockResolvedValue(undefined)

    await runScopedTypecheck()

    expect(mockedRunCommand).toHaveBeenCalledWith(
      'pnpm',
      [
        'exec',
        'turbo',
        'run',
        'typecheck',
        '--filter=./packages/ui-kit',
        '--filter=./apps/ui-kit-docs'
      ],
      {}
    )
    expect(mockedRunCommand).toHaveBeenCalledWith(
      'pnpm',
      ['exec', 'tsx', 'scripts/typecheck-extras-run.ts'],
      {}
    )
  })

  it('forwards a given signal to the full typecheck command when the scope is full', async () => {
    mockedGetAffectedScope.mockResolvedValue({ type: 'full' })
    mockedRunCommand.mockResolvedValue(undefined)
    const controller = new AbortController()

    await runScopedTypecheck(controller.signal)

    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['run', 'typecheck:full'], {
      signal: controller.signal
    })
  })

  it('forwards a given signal to every process it spawns', async () => {
    mockedGetAffectedScope.mockResolvedValue({
      type: 'scoped',
      packageDirs: ['packages/ui-kit'],
      appDirs: []
    })
    mockedRunCommand.mockResolvedValue(undefined)
    const controller = new AbortController()

    await runScopedTypecheck(controller.signal)

    expect(mockedRunCommand).toHaveBeenCalledWith(
      'pnpm',
      ['exec', 'turbo', 'run', 'typecheck', '--filter=./packages/ui-kit'],
      { signal: controller.signal }
    )
    expect(mockedRunCommand).toHaveBeenCalledWith(
      'pnpm',
      ['exec', 'tsx', 'scripts/typecheck-extras-run.ts'],
      { signal: controller.signal }
    )
  })

  it('omits signal entirely (not undefined) when called without one', async () => {
    mockedGetAffectedScope.mockResolvedValue({ type: 'full' })
    mockedRunCommand.mockResolvedValue(undefined)

    await runScopedTypecheck()

    const options = mockedRunCommand.mock.calls.at(0)?.[2]

    expect(options).toBeDefined()
    expect(options && 'signal' in options).toBe(false)
  })

  it('propagates a failure from the scoped turbo run', async () => {
    mockedGetAffectedScope.mockResolvedValue({
      type: 'scoped',
      packageDirs: ['packages/ui-kit'],
      appDirs: []
    })
    mockedRunCommand.mockRejectedValue(new Error('Command failed'))

    await expect(runScopedTypecheck()).rejects.toThrow('Command failed')
  })
})
