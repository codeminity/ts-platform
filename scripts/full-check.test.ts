import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runCommand } from './lib/run-command'

vi.mock('./lib/run-command', () => ({
  runCommand: vi.fn()
}))

const { CHECK_STEPS, hasFailures, runFullCheck } = await import('./full-check')

const mockedRunCommand = vi.mocked(runCommand)

beforeEach(() => {
  mockedRunCommand.mockClear()
})

describe('CHECK_STEPS', () => {
  it('runs every step through pnpm', () => {
    expect(CHECK_STEPS.length).toBeGreaterThan(0)
    expect(CHECK_STEPS.every((step) => step.args[0] === 'run')).toBe(true)
  })
})

describe('runFullCheck', () => {
  const steps = [
    { name: 'Passing step', args: ['run', 'passing'] },
    { name: 'Failing step', args: ['run', 'failing'] }
  ]

  it('runs every step and reports pass/fail without stopping on a failure', async () => {
    mockedRunCommand.mockImplementation((_command, args) =>
      args?.includes('failing') ? Promise.reject(new Error('boom')) : Promise.resolve()
    )

    const results = await runFullCheck(steps)

    expect(mockedRunCommand).toHaveBeenCalledTimes(2)
    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['run', 'passing'])
    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['run', 'failing'])
    expect(results.map(({ name, passed }) => ({ name, passed }))).toEqual([
      { name: 'Passing step', passed: true },
      { name: 'Failing step', passed: false }
    ])
    expect(results.every((result) => typeof result.durationMs === 'number')).toBe(true)
  })

  it('invokes onStepStart and onStepComplete for each step', async () => {
    mockedRunCommand.mockResolvedValue(undefined)
    const onStepStart = vi.fn()
    const onStepComplete = vi.fn()

    await runFullCheck(steps, { onStepStart, onStepComplete })

    expect(onStepStart).toHaveBeenCalledTimes(2)
    expect(onStepStart).toHaveBeenCalledWith(steps[0])
    expect(onStepComplete).toHaveBeenCalledTimes(2)
    expect(onStepComplete).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Passing step', passed: true })
    )
  })

  it('defaults to CHECK_STEPS when no steps are given', async () => {
    mockedRunCommand.mockResolvedValue(undefined)

    const results = await runFullCheck()

    expect(mockedRunCommand).toHaveBeenCalledTimes(CHECK_STEPS.length)
    expect(results).toHaveLength(CHECK_STEPS.length)
  })
})

describe('hasFailures', () => {
  it('returns true when at least one result failed', () => {
    expect(
      hasFailures([
        { name: 'a', passed: true, durationMs: 1 },
        { name: 'b', passed: false, durationMs: 1 }
      ])
    ).toBe(true)
  })

  it('returns false when every result passed', () => {
    expect(hasFailures([{ name: 'a', passed: true, durationMs: 1 }])).toBe(false)
  })

  it('returns false for an empty result list', () => {
    expect(hasFailures([])).toBe(false)
  })
})
