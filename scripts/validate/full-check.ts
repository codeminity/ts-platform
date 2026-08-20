import { CommandCancelledError, runCommand } from '../lib/run-command'
import { runIfRelevant } from '../lib/run-if-relevant'

import { runScopedLint } from './lint'
import { runScopedTypecheck } from './typecheck'

export interface CheckStep {
  name: string
  args: string[]
  // Names of other steps that must finish first. Only needed for the 3
  // steps that actually consume dist/ output (Verify Packages, Bundle Size,
  // Browser E2E) — everything else reads source directly and has no real
  // ordering requirement beyond Install having finished. Steps with no
  // dependsOn (other than Install itself) run concurrently.
  dependsOn?: string[]
  // When present, run in-process instead of `runCommand('pnpm', args,
  // {signal})` — see the Lint/Typecheck steps below, and DECISIONS.md
  // ADR-012's third bug, for why this exists.
  run?: (signal: AbortSignal) => Promise<void>
}

// Mirrors ci.yml's "Test / Build / Lint" job checks, plus the slow e2e
// checks that only run via a separate job there. Mutation testing is
// deliberately not part of this list at all — see DECISIONS.md ADR-017 for
// why it moved to a standalone nightly CI workflow instead.
// Changeset Required (changesets.yml) is folded in here too, right after
// install, since it's cheap and exercises the changesets CLI's own
// dependencies (e.g. js-yaml via read-yaml-file) - a path nothing else in
// this list touches, and the reason a real override break once slipped
// past a passing full-check.
//
// Execution order here is NOT the same as run order — see runFullCheck.
// Install always runs alone, first. Everything else runs concurrently
// except the steps that need Build's dist/ output (declared via
// dependsOn), which wait for it specifically — not for other slower
// unrelated siblings, none of which are a dependency of anything.
// Steps below marked `dependsOn: ['Build']` all share the same real cause,
// confirmed by directly emptying a package's dist/ and watching what each
// command actually does (not inferred from reading the command's own code):
// any package that depends on another workspace package (e.g.
// @codeminity/axios -> @codeminity/request-core, ui-kit-docs ->
// @codeminity/ui-kit) resolves that dependency's types *and* runtime code
// through its package.json "exports" field, which points at dist/, not
// src/ — there is no dev-time alias back to source anywhere in this repo.
// Running one of these concurrently with Build risks two different failure
// shapes depending on the command: a loud crash (Cannot find module) for
// anything that does real ESM resolution (Test (coverage), API Exports
// Validation), or a *silent wrong result* for anything
// type-aware (Lint's type-checked ESLint rules, Typecheck, Node Module
// Resolution) — confirmed directly: with @codeminity/request-core's dist/
// removed, ESLint reported 9 fabricated "unsafe access on unresolvable
// type" errors on ui-kit-docs source that has nothing wrong with it, and
// `tsc -p tsconfig.esm-strict.json` cascaded into dozens of unrelated
// errors across @codeminity/axios. A step with no cross-package workspace
// dependency at all (Lit CSS Validation only scans @codeminity/ui-kit,
// which has none) has no such exposure and is left concurrent.
export const CHECK_STEPS: CheckStep[] = [
  { name: 'Install Dependencies', args: ['install', '--frozen-lockfile'] },
  { name: 'Audit Dependencies', args: ['audit', '--audit-level=moderate'] },
  { name: 'Changeset Required', args: ['run', 'validate:changeset'] },
  { name: 'Build', args: ['run', 'build'] },
  // Deliberately `run:` (in-process, same reasoning as Lint/Typecheck
  // below) instead of `args:`: these two are genuinely
  // self-contained — no cross-package workspace dependency to reason
  // about, so a plain "did anything under this path change" check (via
  // hasRelevantChanges, not the heavier package-graph-aware
  // getAffectedScope) is enough to safely skip them outright when nothing
  // relevant did. See DECISIONS.md ADR-016 for why most of the *other*
  // still-unscoped steps don't qualify for this simpler treatment.
  {
    name: 'Lit CSS Validation',
    args: ['run', 'validate:lit-css'],
    run: (signal) =>
      runIfRelevant('Lit CSS Validation', 'packages/ui-kit/', 'validate:lit-css', signal)
  },
  { name: 'Format Validation', args: ['run', 'validate:format'] },
  {
    name: 'Dependency Architecture',
    args: ['run', 'validate:deps'],
    run: (signal) => runIfRelevant('Dependency Architecture', 'packages/', 'validate:deps', signal)
  },
  // Deliberately `run:` (in-process): `pnpm lint`/`pnpm typecheck` are
  // themselves now the *scoped* commands (scripts/lint.ts,
  // scripts/typecheck.ts) — each computes which packages/apps are actually
  // affected via getAffectedScope() and narrows the real lint/typecheck run
  // to just those, falling back to the full, unscoped
  // `lint:full`/`typecheck:full` whenever a change lands somewhere
  // Turborepo's package graph can't attribute to a specific package/app
  // (root config, scripts/). Routing that through a nested `pnpm run
  // lint`/`pnpm run typecheck` spawned from inside an already-spawned child
  // would reintroduce the exact orphaned-process class of bug described in
  // DECISIONS.md ADR-012's third bug — the process each one still spawns
  // needs the same signal this step's own cancellation uses, with no
  // unmonitored hop.
  { name: 'Lint', args: ['run', 'lint'], dependsOn: ['Build'], run: runScopedLint },
  { name: 'Test (coverage)', args: ['run', 'test:coverage'], dependsOn: ['Build'] },
  {
    name: 'Node Module Resolution',
    args: ['run', 'validate:node-resolution'],
    dependsOn: ['Build']
  },
  { name: 'API Exports Validation', args: ['run', 'validate:api-exports'], dependsOn: ['Build'] },
  { name: 'Typecheck', args: ['run', 'typecheck'], dependsOn: ['Build'], run: runScopedTypecheck },
  // Also needs dist/ for its own reason, on top of the cross-package one
  // in the block comment above: it type-checks every TypeScript code block
  // found in the docs against the package's real *published* types
  // (dist/*.d.ts), not internal source — confirmed the hard way, running
  // concurrently with Build produced "Missing build output" before this
  // depended on it.
  { name: 'Document Validation', args: ['run', 'validate:docs'], dependsOn: ['Build'] },
  { name: 'Verify Packages', args: ['run', 'verify:packages'], dependsOn: ['Build'] },
  { name: 'Bundle Size', args: ['run', 'validate:size'], dependsOn: ['Build'] },
  { name: 'Browser E2E', args: ['run', 'test:e2e'], dependsOn: ['Build'] }
]

export interface CheckStepResult {
  name: string
  passed: boolean
  durationMs: number
  // True when this step never actually ran to completion — either it was
  // killed mid-flight, or skipped entirely — because a different step had
  // already failed. Distinguishes "this is the thing you need to fix" from
  // "this just got caught in the fail-fast stop."
  cancelled?: boolean
}

export interface RunFullCheckOptions {
  onStepStart?: (step: CheckStep) => void
  onStepComplete?: (result: CheckStepResult) => void
}

// Owns the "stop everything" state behind methods rather than a raw
// mutable field — besides encapsulating the "only the first failure
// triggers a stop" logic in one place, a direct property read of a flag
// that's mutated by concurrent sibling calls is exactly the kind of thing
// TypeScript's control-flow narrowing gets wrong (it can't see the
// mutation happening in a different async call), which trips
// @typescript-eslint/no-unnecessary-condition on a check that's very much
// necessary at runtime. A function call isn't narrowed the same way.
interface Scheduler {
  signal: AbortSignal
  isStopped(): boolean
  stopOnFailure(): void
}

function createScheduler(): Scheduler {
  const controller = new AbortController()
  let stopped = false

  return {
    signal: controller.signal,
    isStopped: () => stopped,
    stopOnFailure: () => {
      if (stopped) return
      stopped = true
      controller.abort()
    }
  }
}

async function runStep(
  step: CheckStep,
  waitFor: Promise<unknown>[],
  options: RunFullCheckOptions,
  scheduler: Scheduler
): Promise<CheckStepResult> {
  // Wait for dependencies first — a rejected dependency (a failed step)
  // must not prevent this one from still being attempted and reported
  // (unless a failure has since triggered a full-check-wide stop, handled
  // below), matching the existing "every step runs regardless of others
  // failing" guarantee for dependency-only ordering.
  await Promise.allSettled(waitFor)

  // full-check is a local dev tool, not CI — once anything has failed,
  // there's no reason to keep spending time/CPU on steps the developer is
  // about to go fix something and rerun anyway. A step that hasn't started
  // yet by the time that happens is skipped outright, never even spawned.
  if (scheduler.isStopped()) {
    return { name: step.name, passed: false, durationMs: 0, cancelled: true }
  }

  options.onStepStart?.(step)

  const start = Date.now()
  let passed = false
  let cancelled = false

  try {
    if (step.run) {
      await step.run(scheduler.signal)
    } else {
      await runCommand('pnpm', step.args, { signal: scheduler.signal })
    }
    passed = true
  } catch (error) {
    if (error instanceof CommandCancelledError) {
      cancelled = true
    } else {
      // A genuine (non-cancelled) failure always triggers the stop —
      // stopOnFailure() is idempotent, so if something else already
      // stopped things, this is a no-op. This step still reports as a
      // real failure either way: it exited non-zero on its own, whether or
      // not another step happened to fail around the same time.
      scheduler.stopOnFailure()
    }
  }

  const result: CheckStepResult = {
    name: step.name,
    passed,
    durationMs: Date.now() - start,
    ...(cancelled ? { cancelled: true } : {})
  }
  options.onStepComplete?.(result)
  return result
}

export async function runFullCheck(
  steps: CheckStep[] = CHECK_STEPS,
  options: RunFullCheckOptions = {}
): Promise<CheckStepResult[]> {
  const [install, ...rest] = steps
  if (!install) return []

  const scheduler = createScheduler()
  const promises = new Map<string, Promise<CheckStepResult>>()

  function requireDependency(name: string, requestedBy: string): Promise<CheckStepResult> {
    const promise = promises.get(name)
    if (!promise) throw new Error(`Step "${requestedBy}" depends on unknown step "${name}"`)
    return promise
  }

  // Install always runs alone, first — everything else, explicitly or
  // implicitly, depends on it (nothing should touch node_modules while it's
  // still being written).
  const installPromise = runStep(install, [], options, scheduler)
  promises.set(install.name, installPromise)

  for (const step of rest) {
    const waitFor = [
      installPromise,
      ...(step.dependsOn ?? []).map((depName) => requireDependency(depName, step.name))
    ]
    promises.set(step.name, runStep(step, waitFor, options, scheduler))
  }

  return Promise.all(
    steps.map((step) => {
      const promise = promises.get(step.name)
      // Every name in `steps` was just registered above (or is `install`
      // itself), so this is provably unreachable — it exists only because
      // Map#get's return type is possibly-undefined.
      /* v8 ignore next */
      if (!promise) throw new Error(`No promise registered for step "${step.name}"`)
      return promise
    })
  )
}

export function hasFailures(results: CheckStepResult[]): boolean {
  return results.some((result) => !result.passed)
}
