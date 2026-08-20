import { getAffectedScope } from '../lib/affected-scope'
import { runCommand } from '../lib/run-command'

// `signal`, when given, is forwarded to every process this spawns — see
// full-check.ts's own `run:` comment on the Lint step for why this runs
// in-process from there instead of via a nested `pnpm run lint`: a spawn
// from *inside* an already-spawned child has no signal of its own, and a
// fail-fast kill on the outer process can miss it entirely.
export async function runScopedLint(signal?: AbortSignal): Promise<void> {
  const scope = await getAffectedScope()

  if (scope.type === 'full') {
    console.log('Change outside packages/apps detected — running full lint.')
    await runCommand('pnpm', ['run', 'lint:full'], signal ? { signal } : {})
    return
  }

  const dirs = [...scope.packageDirs, ...scope.appDirs]

  if (dirs.length === 0) {
    console.log('No package/app changes since origin/main — skipping lint.')
    return
  }

  console.log(`Linting ${String(dirs.length)} affected package(s)/app(s): ${dirs.join(', ')}`)

  await runCommand(
    'pnpm',
    ['exec', 'eslint', ...dirs, '--cache', '--cache-location', '.eslintcache'],
    signal ? { signal } : {}
  )
}
