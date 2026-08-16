import { hasRelevantChanges } from './relevant-changes'
import { runCommand } from './run-command'

// Shared by every full-check step that's genuinely self-contained (no
// cross-package workspace dependency to reason about — see
// hasRelevantChanges' own comment on why most steps don't qualify for
// this and need getAffectedScope's package-graph awareness instead):
// skip the underlying `pnpm run <scriptName>` outright when nothing under
// `pathPrefix` changed, run it unscoped otherwise. `signal`, when given, is
// forwarded straight through — this is called in-process (`run:` on the
// CheckStep, not `args:`) for the same reason Mutation Testing/Lint/
// Typecheck are: a nested `pnpm run` spawned from an already-spawned child
// has no signal of its own for a fail-fast kill to reach.
export async function runIfRelevant(
  label: string,
  pathPrefix: string,
  scriptName: string,
  signal?: AbortSignal
): Promise<void> {
  const relevant = await hasRelevantChanges(pathPrefix)

  if (!relevant) {
    console.log(`No ${pathPrefix} changes since origin/main — skipping ${label}.`)
    return
  }

  await runCommand('pnpm', ['run', scriptName], signal ? { signal } : {})
}
