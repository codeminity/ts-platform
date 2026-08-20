import { globby } from 'globby'

import { runCommand } from '../lib/run-command'

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

  // Each tsconfig here is a fully independent tsc invocation — no shared
  // mutable state between them (own project, own .tsbuildinfo file) — so
  // running them concurrently is a pure win, the same reasoning already
  // applied to verify-packages.ts. This was worth checking rather than
  // assuming: --incremental was already doing its job correctly (a single
  // invocation re-run in isolation took ~1.3s, not meaningfully faster
  // still), but running 9 tsconfigs one after another paid the same ~1.3s
  // of process-spawn-plus-tsc-startup overhead 9 times regardless — measured
  // at ~10.7s sequential for this repo's current tsconfig count, both on a
  // cold run and immediately re-run warm.
  await Promise.all(
    tsconfigs.map(async (tsconfig) => {
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
    })
  )
}
