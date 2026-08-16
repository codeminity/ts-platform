import { exec as defaultExec } from 'node:child_process'
import { promisify } from 'node:util'

import { getChangedFiles, type ExecFn } from './affected-scope'

const execAsync = promisify(defaultExec)

export type { ExecFn }

// For steps that are genuinely self-contained — no cross-package workspace
// dependency to worry about (see DECISIONS.md ADR-015 on why most of
// full-check's remaining unscoped steps do *not* qualify for this simpler
// check and need getAffectedScope's package-graph awareness instead). A
// step is relevant when at least one changed file (tracked or untracked)
// falls under `pathPrefix`. Mirrors getAffectedScope's own safety posture:
// if changed files can't be determined at all (e.g. CI's shallow clone
// means `origin/main` isn't a resolvable ref), or if nothing changed at
// all, this is not the kind of "definitely nothing relevant happened" case
// that ADR-015 draws a line around — the *inability* to tell should never
// look the same as a confirmed-empty diff, so an error here also resolves
// to "relevant" (don't skip), never silently to "not relevant".
export async function hasRelevantChanges(
  pathPrefix: string,
  baseRef = 'origin/main',
  exec: ExecFn = execAsync
): Promise<boolean> {
  try {
    const changedFiles = await getChangedFiles(baseRef, exec)
    return changedFiles.some((file) => file.startsWith(pathPrefix))
  } catch (error) {
    console.warn(
      `Could not determine changed files (${error instanceof Error ? error.message : String(error)}) — treating as relevant.`
    )
    return true
  }
}
