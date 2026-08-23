import fs from 'node:fs'

import { runCommand } from '../lib/run-command'

const CONFIG_PATH = '.size-limit.json'

interface SizeLimitEntry {
  name: string
  path: string
  limit: string
  ignore?: string[]
}

/**
 * Returns `false` (a skip, not a failure) when none of `.size-limit.json`'s
 * entries have a built `dist` file yet — a workspace with no packages built
 * has nothing to measure, and `size-limit` itself errors ("Size Limit can't
 * find files at ...") rather than succeeding trivially when a configured
 * path doesn't exist, so this must be checked before ever invoking it.
 *
 * When only *some* entries exist (a partial build, or a package genuinely
 * removed from the workspace with its config entry not yet cleaned up),
 * `.size-limit.json` is temporarily rewritten to just the entries that do
 * exist, and restored afterward regardless of outcome — the same
 * backup/mutate/restore pattern `find-redundant-tests.ts` already uses for
 * a real file it needs to temporarily change.
 */
export async function validateBundleSize(): Promise<boolean> {
  const original = fs.readFileSync(CONFIG_PATH, 'utf8')
  const entries = JSON.parse(original) as SizeLimitEntry[]
  const existing = entries.filter((entry) => fs.existsSync(entry.path))

  if (existing.length === 0) return false

  if (existing.length === entries.length) {
    await runCommand('pnpm', ['exec', 'size-limit'])
    return true
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2))

  try {
    await runCommand('pnpm', ['exec', 'size-limit'])
  } finally {
    fs.writeFileSync(CONFIG_PATH, original)
  }

  return true
}
