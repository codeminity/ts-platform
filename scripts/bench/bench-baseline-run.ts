import fs from 'node:fs'

import { runCommand } from '../lib/run-command.js'

// Vitest 5 dropped `vitest bench --outputJson` (the single combined report
// this used to read); each `*.bench.ts` file now writes its own entry here
// instead, via `writeBenchFileReport` — see bench-file-report.ts.
const RESULTS_DIR = '.bench-results'
const BASELINE_DIR = 'bench-baseline'

async function main(): Promise<void> {
  fs.rmSync(RESULTS_DIR, { recursive: true, force: true })

  await runCommand('pnpm', ['exec', 'vitest', 'bench', '--run'])

  fs.rmSync(BASELINE_DIR, { recursive: true, force: true })
  fs.cpSync(RESULTS_DIR, BASELINE_DIR, { recursive: true })

  console.log(`Baseline saved to ${BASELINE_DIR}/ — run "pnpm bench:compare" to diff against it.`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
