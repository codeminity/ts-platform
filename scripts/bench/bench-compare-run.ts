import fs from 'node:fs'

import { runCommand } from '../lib/run-command.js'

import { collectBenchFileReports } from './bench-file-report.js'
import { compareBenchReports } from './compare-bench-reports.js'
import { formatBenchReport } from './format-bench-report.js'

// Same reasoning as bench-nightly-run.ts's own THRESHOLD_PERCENT — a local
// machine is quieter than a shared CI runner, but still noisy enough that a
// tight threshold would be mostly false alarms.
const THRESHOLD_PERCENT = 50

const RESULTS_DIR = '.bench-results'
const BASELINE_DIR = 'bench-baseline'

async function main(): Promise<void> {
  if (!fs.existsSync(BASELINE_DIR)) {
    console.error(`No baseline found at ${BASELINE_DIR}/ — run "pnpm bench:baseline" first.`)
    process.exit(1)
  }

  fs.rmSync(RESULTS_DIR, { recursive: true, force: true })

  await runCommand('pnpm', ['exec', 'vitest', 'bench', '--run'])

  const baseline = collectBenchFileReports(BASELINE_DIR)
  const current = collectBenchFileReports(RESULTS_DIR)

  const report = formatBenchReport(
    [
      {
        packageName: 'local',
        status: 'compared',
        baselineTag: `${BASELINE_DIR}/`,
        result: compareBenchReports(baseline, current, THRESHOLD_PERCENT)
      }
    ],
    THRESHOLD_PERCENT
  )

  console.log(report)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
