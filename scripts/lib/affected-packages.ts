import { exec as defaultExec } from 'node:child_process'
import { promisify } from 'node:util'

import { getAffectedScope, type ExecFn } from './affected-scope'

const execAsync = promisify(defaultExec)

export type { ExecFn }

// Mutation testing is deliberately packages/-only (ADR-007 — apps/ is never
// mutated), so this stays a thin wrapper around getAffectedScope rather
// than exposing apps/ scoping too. `'full'` means a change landed
// somewhere getAffectedScope can't attribute to any specific package (root
// config, scripts/) — the safe response is to mutate everything, i.e. not
// pass a STRYKER_MUTATE_DIRS override at all, not to scope to an empty (and
// therefore skipped) set. See getAffectedScope's own comment for why this
// matters more than it might look like it does.
export async function getAffectedPackageDirs(
  baseRef = 'origin/main',
  packagesDir = 'packages',
  exec: ExecFn = execAsync
): Promise<string[] | 'full'> {
  const scope = await getAffectedScope(baseRef, exec, packagesDir)

  if (scope.type === 'full') return 'full'
  return scope.packageDirs
}
