import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./relevant-changes', () => ({ hasRelevantChanges: vi.fn() }))
vi.mock('./run-command', () => ({ runCommand: vi.fn() }))

const { hasRelevantChanges } = await import('./relevant-changes')
const { runCommand } = await import('./run-command')
const { runIfRelevant } = await import('./run-if-relevant')

const mockedHasRelevantChanges = vi.mocked(hasRelevantChanges)
const mockedRunCommand = vi.mocked(runCommand)

beforeEach(() => {
  mockedHasRelevantChanges.mockReset()
  mockedRunCommand.mockReset()
})

describe('runIfRelevant', () => {
  it('skips the script entirely when nothing relevant changed', async () => {
    mockedHasRelevantChanges.mockResolvedValue(false)

    await runIfRelevant('Lit CSS Validation', 'packages/ui-kit/', 'validate:lit-css')

    expect(mockedHasRelevantChanges).toHaveBeenCalledWith('packages/ui-kit/')
    expect(mockedRunCommand).not.toHaveBeenCalled()
  })

  it('runs the given script when something relevant changed', async () => {
    mockedHasRelevantChanges.mockResolvedValue(true)
    mockedRunCommand.mockResolvedValue(undefined)

    await runIfRelevant('Dependency Architecture', 'packages/', 'validate:deps')

    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['run', 'validate:deps'], {})
  })

  it('forwards a given signal to the spawned process', async () => {
    mockedHasRelevantChanges.mockResolvedValue(true)
    mockedRunCommand.mockResolvedValue(undefined)
    const controller = new AbortController()

    await runIfRelevant('Dependency Architecture', 'packages/', 'validate:deps', controller.signal)

    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['run', 'validate:deps'], {
      signal: controller.signal
    })
  })

  it('omits signal entirely (not undefined) when called without one', async () => {
    mockedHasRelevantChanges.mockResolvedValue(true)
    mockedRunCommand.mockResolvedValue(undefined)

    await runIfRelevant('Dependency Architecture', 'packages/', 'validate:deps')

    const options = mockedRunCommand.mock.calls.at(0)?.[2]
    expect(options).toBeDefined()
    expect(options && 'signal' in options).toBe(false)
  })

  it('propagates a real failure from the underlying script', async () => {
    mockedHasRelevantChanges.mockResolvedValue(true)
    mockedRunCommand.mockRejectedValue(new Error('Command failed'))

    await expect(
      runIfRelevant('Dependency Architecture', 'packages/', 'validate:deps')
    ).rejects.toThrow('Command failed')
  })
})
