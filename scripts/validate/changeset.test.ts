import { describe, expect, it, vi } from 'vitest'

import { runCommand } from '../lib/run-command'

import { validateChangeset } from './changeset'

import type { ExecFileFn } from './changeset'

vi.mock(import('../lib/run-command'), () => ({
  runCommand: vi.fn<typeof runCommand>()
}))

const mockedRunCommand = vi.mocked(runCommand)

describe(validateChangeset, () => {
  it('skips (returns false) rather than failing when origin/main does not resolve', async () => {
    const exec = vi.fn<ExecFileFn>().mockRejectedValue(new Error('unknown revision'))

    await expect(validateChangeset(exec)).resolves.toBe(false)

    expect(exec).toHaveBeenCalledWith('git', ['rev-parse', '--verify', '--quiet', 'origin/main'])
    expect(mockedRunCommand).not.toHaveBeenCalled()
  })

  it('runs changeset status via pnpm exec and returns true when origin/main resolves', async () => {
    const exec = vi.fn<ExecFileFn>().mockResolvedValue(undefined)
    mockedRunCommand.mockResolvedValue(undefined)

    await expect(validateChangeset(exec)).resolves.toBe(true)

    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', [
      'exec',
      'changeset',
      'status',
      '--since=origin/main'
    ])
  })

  it('propagates a real changeset failure (a package changed with no changeset)', async () => {
    const exec = vi.fn<ExecFileFn>().mockResolvedValue(undefined)
    mockedRunCommand.mockRejectedValue(new Error('missing changeset'))

    await expect(validateChangeset(exec)).rejects.toThrow('missing changeset')
  })

  it('defaults to a real git rev-parse when no exec function is injected', async () => {
    // No mock override — exercises the real `defaultExec`/`execFileAsync`
    // path against whatever environment actually runs this test, rather
    // than only ever testing through the injected fake. Deliberately does
    // not assert which outcome that real `git rev-parse` produces — this
    // suite must stay deterministic in an environment with no git and no
    // `origin/main` at all (e.g. this exact script running against an
    // otherwise-empty scaffold copy, not just against this repo itself).
    mockedRunCommand.mockResolvedValue(undefined)

    const result = await validateChangeset()

    expect(result).toBeTypeOf('boolean')
  })
})
