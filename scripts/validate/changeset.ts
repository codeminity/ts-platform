import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { runCommand } from '../lib/run-command'

const execFileAsync = promisify(execFile)

export type ExecFileFn = (command: string, args: string[]) => Promise<unknown>

const defaultExec: ExecFileFn = (command, args) => execFileAsync(command, args)

async function originMainExists(exec: ExecFileFn): Promise<boolean> {
  try {
    await exec('git', ['rev-parse', '--verify', '--quiet', 'origin/main'])
    return true
  } catch {
    return false
  }
}

/**
 * Returns `false` (a skip, not a failure) when `origin/main` doesn't resolve
 * at all — no git repository, a repo with no remote configured yet, or a
 * shallow/single-ref clone that never fetched it. `changeset status
 * --since=<ref>` needs a git history to diff against to answer "did you
 * forget a changeset" at all; there's no way to answer that question
 * without one, so this isn't a gap to work around, just a real prerequisite
 * to check for before crashing on it.
 */
export async function validateChangeset(exec: ExecFileFn = defaultExec): Promise<boolean> {
  if (!(await originMainExists(exec))) return false

  await runCommand('pnpm', ['exec', 'changeset', 'status', '--since=origin/main'])

  return true
}
