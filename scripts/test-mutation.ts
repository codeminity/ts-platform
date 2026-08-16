import { getAffectedPackageDirs } from './lib/affected-packages'
import { runCommand } from './lib/run-command'

// `signal`, when given, is forwarded straight to the one process this still
// spawns (Stryker) — see full-check.ts's CHECK_STEPS comment on why this is
// called in-process from there instead of via a nested `pnpm run
// test:mutation`, which would put an unmonitored process-spawn boundary
// between full-check's AbortSignal and the actual Stryker process tree.
export async function runScopedMutationTesting(signal?: AbortSignal): Promise<void> {
  const affectedDirs = await getAffectedPackageDirs()

  if (affectedDirs.length === 0) {
    console.log('No package changes since origin/main — skipping mutation testing.')
    return
  }

  console.log(
    `Mutation testing ${String(affectedDirs.length)} affected package(s): ${affectedDirs.join(', ')}`
  )

  await runCommand('pnpm', ['run', 'test:mutation:full'], {
    ...(signal ? { signal } : {}),
    env: { STRYKER_MUTATE_DIRS: JSON.stringify(affectedDirs) }
  })
}
