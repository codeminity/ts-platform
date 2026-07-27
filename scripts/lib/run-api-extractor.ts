import { runCommand } from './run-command'

// Deliberately omits --local: that flag auto-copies the generated report over
// etc/*.api.md and exits 0 even when the public API drifted, which would let a
// leaked or undocumented export silently pass verification. Without it, a stale
// or changed report fails the run — the report diff must be committed by hand
// (e.g. `pnpm exec api-extractor run --local` inside the package) as a deliberate act.
export async function runApiExtractor(packagePath: string): Promise<void> {
  await runCommand('pnpm', ['exec', 'api-extractor', 'run'], {
    cwd: packagePath
  })
}
