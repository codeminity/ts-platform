import { globby } from 'globby'

import { runCommand } from '../lib/run-command'

const TARGET_GLOB = 'packages/**/src/**/*.ts'

/**
 * Returns `false` (a skip, not a failure) when there's nothing to check — a
 * workspace with no packages yet has no source files this check applies to,
 * and TypeScript itself errors (`TS18003: No inputs were found`) rather than
 * succeeding trivially when its own `include` glob matches zero files, so
 * this must be checked before ever invoking `tsc` at all.
 */
export async function validateNodeResolution(): Promise<boolean> {
  const files = await globby([TARGET_GLOB], { ignore: ['**/node_modules/**'] })

  if (files.length === 0) return false

  await runCommand('pnpm', [
    'exec',
    'tsc',
    '-p',
    'tsconfig.esm-strict.json',
    '--noEmit',
    '--incremental',
    '--tsBuildInfoFile',
    'tsconfig.esm-strict.json.tsbuildinfo'
  ])

  return true
}
