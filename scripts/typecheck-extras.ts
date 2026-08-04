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
  const [packageE2eTsconfigs, packageBenchTsconfigs] = await Promise.all([
    globby('packages/*/*/e2e/tsconfig.json'),
    globby('packages/*/*/bench/tsconfig.json')
  ])

  return [...FIXED_TSCONFIGS, ...packageE2eTsconfigs, ...packageBenchTsconfigs].sort()
}

export async function typecheckExtras(onProgress?: (tsconfig: string) => void): Promise<void> {
  const tsconfigs = await findExtraTsconfigs()

  for (const tsconfig of tsconfigs) {
    onProgress?.(tsconfig)
    await runCommand('pnpm', ['exec', 'tsc', '-p', tsconfig, '--noEmit'])
  }
}
