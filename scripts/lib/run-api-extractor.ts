import path from 'node:path'

import { globby } from 'globby'

import { runCommand } from './run-command'

// Deliberately omits --local: that flag auto-copies the generated report over
// etc/*.api.md and exits 0 even when the public API drifted, which would let a
// leaked or undocumented export silently pass verification. Without it, a stale
// or changed report fails the run — the report diff must be committed by hand
// (e.g. `pnpm exec api-extractor run --local` inside the package) as a deliberate act.
//
// A package can have more than one API Extractor config (e.g. `@codeminity/ui-kit`'s
// `api-extractor.json` for its "." entry and `api-extractor.vue.json` for "./vue") —
// API Extractor itself only supports one entry point per config, so a multi-subpath
// package needs one config per entry. Every `api-extractor*.json` found in the
// package root gets run; a single-entry package still has exactly one match
// (`api-extractor.json`), so this is a strict superset of the old behavior.
export async function runApiExtractor(packagePath: string): Promise<void> {
  const configs = await globby('api-extractor*.json', { cwd: packagePath })

  for (const config of configs.sort()) {
    await runCommand(
      'pnpm',
      ['exec', 'api-extractor', 'run', '--config', path.join(packagePath, config)],
      {
        cwd: packagePath
      }
    )
  }
}
