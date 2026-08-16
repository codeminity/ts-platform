import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./lib/affected-packages', () => ({ getAffectedPackageDirs: vi.fn() }))
vi.mock('./lib/run-command', () => ({ runCommand: vi.fn() }))

const { getAffectedPackageDirs } = await import('./lib/affected-packages')
const { runCommand } = await import('./lib/run-command')
const { runScopedMutationTesting } = await import('./test-mutation')

const mockedGetAffectedPackageDirs = vi.mocked(getAffectedPackageDirs)
const mockedRunCommand = vi.mocked(runCommand)

beforeEach(() => {
  mockedGetAffectedPackageDirs.mockReset()
  mockedRunCommand.mockReset()
})

describe('runScopedMutationTesting', () => {
  it('skips Stryker entirely when no packages are affected', async () => {
    mockedGetAffectedPackageDirs.mockResolvedValue([])

    await runScopedMutationTesting()

    expect(mockedRunCommand).not.toHaveBeenCalled()
  })

  it('runs the full stryker script scoped to the affected package dirs', async () => {
    mockedGetAffectedPackageDirs.mockResolvedValue(['packages/ui-kit', 'packages/request/axios'])
    mockedRunCommand.mockResolvedValue(undefined)

    await runScopedMutationTesting()

    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['run', 'test:mutation:full'], {
      env: { STRYKER_MUTATE_DIRS: JSON.stringify(['packages/ui-kit', 'packages/request/axios']) }
    })
  })

  it('propagates a Stryker failure (e.g. mutation score below threshold)', async () => {
    mockedGetAffectedPackageDirs.mockResolvedValue(['packages/ui-kit'])
    mockedRunCommand.mockRejectedValue(new Error('Command failed'))

    await expect(runScopedMutationTesting()).rejects.toThrow('Command failed')
  })

  it('forwards a given signal straight to the Stryker runCommand call', async () => {
    mockedGetAffectedPackageDirs.mockResolvedValue(['packages/ui-kit'])
    mockedRunCommand.mockResolvedValue(undefined)
    const controller = new AbortController()

    await runScopedMutationTesting(controller.signal)

    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['run', 'test:mutation:full'], {
      signal: controller.signal,
      env: { STRYKER_MUTATE_DIRS: JSON.stringify(['packages/ui-kit']) }
    })
  })

  it('omits signal entirely (not undefined) when called without one', async () => {
    mockedGetAffectedPackageDirs.mockResolvedValue(['packages/ui-kit'])
    mockedRunCommand.mockResolvedValue(undefined)

    await runScopedMutationTesting()

    const options = mockedRunCommand.mock.calls.at(0)?.[2]
    expect(options).toBeDefined()
    expect(options && 'signal' in options).toBe(false)
  })
})
