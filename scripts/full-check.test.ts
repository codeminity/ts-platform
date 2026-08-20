import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CommandCancelledError, runCommand } from './lib/run-command'

import type * as RunCommandModule from './lib/run-command'

vi.mock(import('./lib/run-command'), async (importOriginal) => {
  const actual = await importOriginal<typeof RunCommandModule>()
  return {
    // CommandCancelledError is a plain, side-effect-free class — reusing
    // the real one keeps `error instanceof CommandCancelledError` checks
    // in full-check.ts working against this mock the same as they would
    // against the real module.
    CommandCancelledError: actual.CommandCancelledError,
    runCommand: vi.fn()
  }
})

// CHECK_STEPS' real Lint/Typecheck/Lit CSS Validation/Dependency
// Architecture entries call the real
// runScopedLint/runScopedTypecheck/runIfRelevant — without these mocks,
// exercising CHECK_STEPS directly (e.g. "defaults to CHECK_STEPS") would
// run real getAffectedScope()/hasRelevantChanges() git/turbo commands as a
// side effect of running the unit test.
vi.mock(import('./lint'), () => ({ runScopedLint: vi.fn() }))
vi.mock(import('./typecheck'), () => ({ runScopedTypecheck: vi.fn() }))
vi.mock(import('./lib/run-if-relevant'), () => ({ runIfRelevant: vi.fn() }))

const { CHECK_STEPS, hasFailures, runFullCheck } = await import('./full-check')
const { runScopedLint } = await import('./lint')
const { runScopedTypecheck } = await import('./typecheck')
const { runIfRelevant } = await import('./lib/run-if-relevant')

const mockedRunCommand = vi.mocked(runCommand)
const mockedRunScopedLint = vi.mocked(runScopedLint)
const mockedRunScopedTypecheck = vi.mocked(runScopedTypecheck)
const mockedRunIfRelevant = vi.mocked(runIfRelevant)

beforeEach(() => {
  mockedRunCommand.mockClear()
  mockedRunIfRelevant.mockClear()
  mockedRunScopedLint.mockClear()
  mockedRunScopedTypecheck.mockClear()
})

describe('CHECK_STEPS', () => {
  it('gives every step a name and a non-empty pnpm invocation', () => {
    expect(CHECK_STEPS.length).toBeGreaterThan(0)
    expect(CHECK_STEPS.every((step) => step.name.length > 0 && step.args.length > 0)).toBe(true)
  })

  it('installs and audits dependencies before any `pnpm run` script', () => {
    expect(CHECK_STEPS[0]?.args).toStrictEqual(['install', '--frozen-lockfile'])
    expect(CHECK_STEPS[1]?.args).toStrictEqual(['audit', '--audit-level=moderate'])
    expect(CHECK_STEPS.slice(2).every((step) => step.args[0] === 'run')).toBe(true)
  })
})

describe('runFullCheck', () => {
  const steps = [
    { name: 'Passing step', args: ['run', 'passing'] },
    { name: 'Failing step', args: ['run', 'failing'] }
  ]

  it('reports pass/fail for every step that actually ran', async () => {
    mockedRunCommand.mockImplementation((_command, args) =>
      args?.includes('failing') ? Promise.reject(new Error('boom')) : Promise.resolve()
    )

    const results = await runFullCheck(steps)

    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['run', 'passing'], expect.anything())
    expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['run', 'failing'], expect.anything())
    expect(results.map(({ name, passed }) => ({ name, passed }))).toStrictEqual([
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
    mockedRunScopedLint.mockResolvedValue(undefined)
    mockedRunScopedTypecheck.mockResolvedValue(undefined)
    mockedRunIfRelevant.mockResolvedValue(undefined)

    const results = await runFullCheck()

    // Every step except Lint/Typecheck/Lit CSS Validation/Dependency
    // Architecture (which use their own in-process `run` instead of the
    // generic `pnpm run <script>` path — see CHECK_STEPS) goes through
    // runCommand directly.
    expect(mockedRunCommand).toHaveBeenCalledTimes(CHECK_STEPS.length - 4)
    expect(mockedRunScopedLint).toHaveBeenCalledTimes(1)
    expect(mockedRunScopedTypecheck).toHaveBeenCalledTimes(1)
    expect(mockedRunIfRelevant).toHaveBeenCalledTimes(2)
    expect(mockedRunIfRelevant).toHaveBeenCalledWith(
      'Lit CSS Validation',
      'packages/ui-kit/',
      'validate:lit-css',
      expect.any(AbortSignal)
    )
    expect(mockedRunIfRelevant).toHaveBeenCalledWith(
      'Dependency Architecture',
      'packages/',
      'validate:deps',
      expect.any(AbortSignal)
    )
    expect(results).toHaveLength(CHECK_STEPS.length)
  })

  it("CHECK_STEPS' scoped entries forward the scheduler's own signal to their run() function", async () => {
    mockedRunCommand.mockResolvedValue(undefined)
    mockedRunScopedLint.mockResolvedValue(undefined)
    mockedRunScopedTypecheck.mockResolvedValue(undefined)
    mockedRunIfRelevant.mockResolvedValue(undefined)

    await runFullCheck()

    for (const mockedRun of [mockedRunScopedLint, mockedRunScopedTypecheck]) {
      const [signal] = mockedRun.mock.calls.at(0) ?? []
      expect(signal).toBeInstanceOf(AbortSignal)
    }

    // runIfRelevant's signal is its 4th positional argument, not its 1st.
    for (const call of mockedRunIfRelevant.mock.calls) {
      expect(call.at(3)).toBeInstanceOf(AbortSignal)
    }
  })

  it('waits for a dependsOn step to finish before starting a dependent one', async () => {
    const callOrder: string[] = []
    let resolveBuild: () => void = () => {
      /* empty */
    }
    const buildGate = new Promise<void>((resolve) => {
      resolveBuild = resolve
    })

    mockedRunCommand.mockImplementation((_command, args) => {
      if (args?.includes('build')) {
        callOrder.push('start:build')
        return buildGate.then(() => {
          callOrder.push('end:build')
        })
      }
      if (args?.includes('verify')) {
        callOrder.push('start:verify')
        return Promise.resolve()
      }
      return Promise.resolve()
    })

    const dependentSteps = [
      { name: 'Install', args: ['install'] },
      { name: 'Build', args: ['run', 'build'] },
      { name: 'Verify', args: ['run', 'verify'], dependsOn: ['Build'] }
    ]

    const resultPromise = runFullCheck(dependentSteps)

    // Build should start on its own (it only waits on Install), but Verify
    // must not — it additionally depends on Build, which is still pending.
    await vi.waitFor(() => {
      expect(callOrder).toContain('start:build')
    })
    expect(callOrder).not.toContain('start:verify')

    resolveBuild()
    await resultPromise

    expect(callOrder).toStrictEqual(['start:build', 'end:build', 'start:verify'])
  })

  it('runs independent steps concurrently, not waiting for one another', async () => {
    const startOrder: string[] = []
    let resolveSlow: () => void = () => {
      /* empty */
    }
    const slowGate = new Promise<void>((resolve) => {
      resolveSlow = resolve
    })

    mockedRunCommand.mockImplementation((_command, args) => {
      if (args?.includes('slow')) {
        startOrder.push('start:slow')
        return slowGate
      }
      if (args?.includes('fast')) {
        startOrder.push('start:fast')
        return Promise.resolve()
      }
      return Promise.resolve()
    })

    const independentSteps = [
      { name: 'Install', args: ['install'] },
      { name: 'Slow', args: ['run', 'slow'] },
      { name: 'Fast', args: ['run', 'fast'] }
    ]

    const resultPromise = runFullCheck(independentSteps)

    // Fast has no reason to wait for Slow — both should have started even
    // though Slow's own command promise is still pending.
    await vi.waitFor(() => {
      expect(startOrder).toContain('start:slow')
      expect(startOrder).toContain('start:fast')
    })

    resolveSlow()
    await resultPromise
  })

  it('returns an empty array for an empty steps list', async () => {
    const results = await runFullCheck([])

    expect(results).toStrictEqual([])
    expect(mockedRunCommand).not.toHaveBeenCalled()
  })

  it('throws when a step declares dependsOn on a name that is not another step', async () => {
    mockedRunCommand.mockResolvedValue(undefined)

    const badSteps = [
      { name: 'Install', args: ['install'] },
      { name: 'Verify', args: ['run', 'verify'], dependsOn: ['Nonexistent'] }
    ]

    await expect(runFullCheck(badSteps)).rejects.toThrow(
      'Step "Verify" depends on unknown step "Nonexistent"'
    )
  })

  it('skips a step outright — never even starting it — once an earlier failure has already stopped everything', async () => {
    let resolveSlow: () => void = () => {
      /* empty */
    }
    const slowGate = new Promise<void>((resolve) => {
      resolveSlow = resolve
    })

    mockedRunCommand.mockImplementation((_command, args) => {
      if (args?.includes('fail')) return Promise.reject(new Error('boom'))
      if (args?.includes('slow')) return slowGate
      return Promise.resolve()
    })

    // Never depends on Slow (not on Install directly) so that, by the time
    // its own wait resolves, Fail — a sibling that only depends on Install —
    // has already run, failed, and called stopOnFailure(). Two steps that
    // become eligible in the very same tick (e.g. both depending only on
    // Install) legitimately race to start together; this is what actually
    // proves a step can be skipped outright.
    const failFastSteps = [
      { name: 'Install', args: ['install'] },
      { name: 'Fail', args: ['run', 'fail'] },
      { name: 'Slow', args: ['run', 'slow'] },
      { name: 'Never', args: ['run', 'never'], dependsOn: ['Slow'] }
    ]

    const resultPromise = runFullCheck(failFastSteps)

    // Let Fail actually run and fail before Slow (and therefore Never)
    // resolves.
    await vi.waitFor(() => {
      expect(mockedRunCommand).toHaveBeenCalledWith('pnpm', ['run', 'fail'], expect.anything())
    })
    resolveSlow()

    const results = await resultPromise

    // Fail genuinely ran and failed; Never should have been skipped
    // outright — runCommand was never even called for it.
    expect(mockedRunCommand).not.toHaveBeenCalledWith('pnpm', ['run', 'never'], expect.anything())
    expect(results).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Fail', passed: false }),
        expect.objectContaining({ name: 'Never', passed: false, cancelled: true, durationMs: 0 })
      ])
    )
    expect(results.find((result) => result.name === 'Fail')).not.toHaveProperty('cancelled')
  })

  it('stays idempotent when two independent steps genuinely fail around the same time', async () => {
    mockedRunCommand.mockImplementation((_command, args) =>
      args?.includes('fail') ? Promise.reject(new Error('boom')) : Promise.resolve()
    )

    // FailA and FailB both depend only on Install, so they start in the
    // same wave and can both genuinely fail before either observes the
    // other's stopOnFailure() — exercising the "already stopped" no-op
    // guard, not just the single-failure path.
    const twoFailuresSteps = [
      { name: 'Install', args: ['install'] },
      { name: 'FailA', args: ['run', 'fail'] },
      { name: 'FailB', args: ['run', 'fail'] }
    ]

    const results = await runFullCheck(twoFailuresSteps)

    expect(results).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'FailA', passed: false }),
        expect.objectContaining({ name: 'FailB', passed: false })
      ])
    )
  })

  it('cancels an already-running step (aborts its signal) when a sibling fails', async () => {
    let capturedSignal: AbortSignal | undefined
    let resolveSlow: (() => void) | undefined

    mockedRunCommand.mockImplementation((_command, args, options) => {
      if (args?.includes('fail')) return Promise.reject(new Error('boom'))
      if (args?.includes('slow')) {
        capturedSignal = options?.signal
        return new Promise<void>((_resolve, reject) => {
          resolveSlow = () => {
            reject(new CommandCancelledError('cancelled'))
          }
        })
      }
      return Promise.resolve()
    })

    const steps2 = [
      { name: 'Install', args: ['install'] },
      { name: 'Fail', args: ['run', 'fail'] },
      { name: 'Slow', args: ['run', 'slow'] }
    ]

    const resultPromise = runFullCheck(steps2)

    await vi.waitFor(() => {
      expect(capturedSignal).toBeDefined()
    })
    await vi.waitFor(() => {
      expect(capturedSignal?.aborted).toBe(true)
    })

    // The mock is standing in for what runCommand itself does on abort —
    // simulate it actually rejecting now that the signal fired.
    resolveSlow?.()

    const results = await resultPromise
    expect(results).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Slow', passed: false, cancelled: true })
      ])
    )
  })

  describe('a step with a custom run() instead of args', () => {
    it('calls run() instead of runCommand, passing the scheduler signal', async () => {
      const run = vi.fn().mockResolvedValue(undefined)
      const customSteps = [
        { name: 'Install', args: ['install'] },
        { name: 'Custom', args: ['run', 'unused'], run }
      ]

      await runFullCheck(customSteps)

      expect(run).toHaveBeenCalledTimes(1)
      expect(run.mock.calls[0]?.[0]).toBeInstanceOf(AbortSignal)
      expect(mockedRunCommand).not.toHaveBeenCalledWith(
        'pnpm',
        ['run', 'unused'],
        expect.anything()
      )
    })

    it('reports the step as passed when run() resolves', async () => {
      const run = vi.fn().mockResolvedValue(undefined)
      const customSteps = [
        { name: 'Install', args: ['install'] },
        { name: 'Custom', args: [], run }
      ]

      const results = await runFullCheck(customSteps)

      expect(results).toStrictEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'Custom', passed: true })])
      )
    })

    it('triggers a repo-wide stop when run() throws a genuine (non-cancelled) error', async () => {
      const run = vi.fn().mockRejectedValue(new Error('mutation score below threshold'))
      const customSteps = [
        { name: 'Install', args: ['install'] },
        { name: 'Custom', args: [], run },
        { name: 'Sibling', args: ['run', 'sibling'] }
      ]

      let capturedSignal: AbortSignal | undefined
      let rejectSibling: (() => void) | undefined

      mockedRunCommand.mockImplementation((_command, args, options) => {
        if (!args?.includes('sibling')) return Promise.resolve()

        capturedSignal = options?.signal
        return new Promise<void>((_resolve, reject) => {
          rejectSibling = () => {
            reject(new CommandCancelledError('cancelled'))
          }
        })
      })

      const resultPromise = runFullCheck(customSteps)

      await vi.waitFor(() => {
        expect(capturedSignal?.aborted).toBe(true)
      })
      rejectSibling?.()

      const results = await resultPromise

      expect(results).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Custom', passed: false }),
          expect.objectContaining({ name: 'Sibling', passed: false, cancelled: true })
        ])
      )
    })

    it('reports run() throwing CommandCancelledError as cancelled, not a genuine failure', async () => {
      const run = vi.fn().mockRejectedValue(new CommandCancelledError('cancelled'))
      const customSteps = [
        { name: 'Install', args: ['install'] },
        { name: 'Custom', args: [], run }
      ]

      const results = await runFullCheck(customSteps)

      expect(results).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Custom', passed: false, cancelled: true })
        ])
      )
    })
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
