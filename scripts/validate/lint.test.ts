import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { getAffectedScope as GetAffectedScope } from '../lib/affected-scope'
import type { runCommand as RunCommand } from '../lib/run-command'

vi.mock(import('../lib/affected-scope'), () => ({
  getAffectedScope: vi.fn<typeof GetAffectedScope>()
}))
vi.mock(import('../lib/run-command'), () => ({ runCommand: vi.fn<typeof RunCommand>() }))

const { getAffectedScope } = await import('../lib/affected-scope')
const { runCommand } = await import('../lib/run-command')
const { runScopedLint } = await import('./lint')

const mockedGetAffectedScope = vi.mocked(getAffectedScope)
const mockedRunCommand = vi.mocked(runCommand)

describe('runScopedLint', () => {
  beforeEach(() => {
    mockedGetAffectedScope.mockReset()
    mockedRunCommand.mockReset()
  })

  it('runs the full lint command when the scope is full', async () => {
    mockedGetAffectedScope.mockResolvedValue({ type: 'full' })
    mockedRunCommand.mockResolvedValue(undefined)

    await runScopedLint()

    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['run', 'lint:full'], {})
    expect(mockedRunCommand).toHaveBeenCalledTimes(1)
  })

  it('skips lint entirely when nothing is affected', async () => {
    mockedGetAffectedScope.mockResolvedValue({ type: 'scoped', packageDirs: [], appDirs: [] })

    await runScopedLint()

    expect(mockedRunCommand).not.toHaveBeenCalled()
  })

  it('runs eslint scoped to affected packages and apps', async () => {
    mockedGetAffectedScope.mockResolvedValue({
      type: 'scoped',
      packageDirs: ['packages/ui-kit'],
      appDirs: ['apps/ui-kit-docs']
    })
    mockedRunCommand.mockResolvedValue(undefined)

    await runScopedLint()

    expect(mockedRunCommand).toHaveBeenCalledWith(
      'pnpm',
      [
        'exec',
        'eslint',
        'packages/ui-kit',
        'apps/ui-kit-docs',
        '--cache',
        '--cache-location',
        '.eslintcache'
      ],
      {}
    )
  })

  it('forwards a given signal to the full lint command when the scope is full', async () => {
    mockedGetAffectedScope.mockResolvedValue({ type: 'full' })
    mockedRunCommand.mockResolvedValue(undefined)
    const controller = new AbortController()

    await runScopedLint(controller.signal)

    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['run', 'lint:full'], {
      signal: controller.signal
    })
  })

  it('forwards a given signal to the eslint process', async () => {
    mockedGetAffectedScope.mockResolvedValue({
      type: 'scoped',
      packageDirs: ['packages/ui-kit'],
      appDirs: []
    })
    mockedRunCommand.mockResolvedValue(undefined)
    const controller = new AbortController()

    await runScopedLint(controller.signal)

    expect(mockedRunCommand).toHaveBeenCalledWith(
      'pnpm',
      ['exec', 'eslint', 'packages/ui-kit', '--cache', '--cache-location', '.eslintcache'],
      { signal: controller.signal }
    )
  })

  it('omits signal entirely (not undefined) when called without one', async () => {
    mockedGetAffectedScope.mockResolvedValue({ type: 'full' })
    mockedRunCommand.mockResolvedValue(undefined)

    await runScopedLint()

    const options = mockedRunCommand.mock.calls.at(0)?.[2]

    expect(options).toBeDefined()
    expect(options && 'signal' in options).toBe(false)
  })

  it('propagates a real lint failure', async () => {
    mockedGetAffectedScope.mockResolvedValue({
      type: 'scoped',
      packageDirs: ['packages/ui-kit'],
      appDirs: []
    })
    mockedRunCommand.mockRejectedValue(new Error('Command failed'))

    await expect(runScopedLint()).rejects.toThrow('Command failed')
  })
})
