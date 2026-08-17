import { getAffectedScope } from './lib/affected-scope'
import { runCommand } from './lib/run-command'

// `signal`, when given, is forwarded to every process this spawns — see
// full-check.ts's own `run:` comment on the Lint step for why this runs
// in-process from there instead of via a nested `pnpm run typecheck`: a
// spawn from *inside* an already-spawned child has no signal of its own,
// and a fail-fast kill on the outer process can miss it entirely.
export async function runScopedTypecheck(signal?: AbortSignal): Promise<void> {
  const scope = await getAffectedScope()

  if (scope.type === 'full') {
    console.log('Change outside packages/apps detected — running full typecheck.')
    await runCommand('pnpm', ['run', 'typecheck:full'], signal ? { signal } : {})
    return
  }

  const dirs = [...scope.packageDirs, ...scope.appDirs]

  if (dirs.length === 0) {
    console.log('No package/app changes since origin/main — skipping typecheck.')
    return
  }

  console.log(`Typechecking ${String(dirs.length)} affected package(s)/app(s): ${dirs.join(', ')}`)

  const filterArgs = dirs.map((dir) => `--filter=./${dir}`)

  await runCommand(
    'pnpm',
    ['exec', 'turbo', 'run', 'typecheck', ...filterArgs],
    signal ? { signal } : {}
  )

  // Not scoped: these are root-level (scripts/tsconfig.json,
  // tsconfig.tooling.json) and per-package e2e/bench tsconfigs, already
  // fast enough on their own that scoping them isn't worth the complexity —
  // see typecheck-extras.ts.
  await runCommand(
    'pnpm',
    ['exec', 'tsx', 'scripts/typecheck-extras-run.ts'],
    signal ? { signal } : {}
  )
}
