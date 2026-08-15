import { globby } from 'globby'

import { runCommand } from './lib/run-command'

// Areas that always exist, regardless of how many packages there are.
const FIXED_TSCONFIGS = ['scripts/tsconfig.json', 'e2e/tsconfig.json', 'tsconfig.tooling.json']

/**
 * Finds every tsconfig outside `turbo run typecheck`'s reach (each package's
 * own src/), so a new package's e2e/ or bench/ folder is covered
 * automatically — nothing here needs updating when one is added.
 */
export async function findExtraTsconfigs(): Promise<string[]> {
  // `**` (not `*/*`) so a one-level-deep package (e.g. `packages/ui-kit`) is
  // found the same as a two-level one (`packages/request/axios`) — but a
  // pnpm workspace symlinks its own workspace deps into every consuming
  // package's `node_modules` (e.g. `packages/request/axios/node_modules/
  // @codeminity/request-core` really points back at `packages/request/core`
  // itself), so without excluding `node_modules` this also matches the same
  // real files a second time through the symlinked path.
  const [packageE2eTsconfigs, packageBenchTsconfigs] = await Promise.all([
    globby('packages/**/e2e/tsconfig.json', { ignore: ['**/node_modules/**'] }),
    globby('packages/**/bench/tsconfig.json', { ignore: ['**/node_modules/**'] })
  ])

  return [...FIXED_TSCONFIGS, ...packageE2eTsconfigs, ...packageBenchTsconfigs].sort()
}

export async function typecheckExtras(onProgress?: (tsconfig: string) => void): Promise<void> {
  const tsconfigs = await findExtraTsconfigs()

  for (const tsconfig of tsconfigs) {
    onProgress?.(tsconfig)
    // --incremental + an explicit build info file lets tsc skip re-checking
    // files whose dependency graph hasn't changed since the last run - safe
    // because tsc's own incremental correctness is what TS project
    // references rely on everywhere, not a heuristic we're introducing.
    await runCommand('pnpm', [
      'exec',
      'tsc',
      '-p',
      tsconfig,
      '--noEmit',
      '--incremental',
      '--tsBuildInfoFile',
      `${tsconfig}.tsbuildinfo`
    ])
  }
}
