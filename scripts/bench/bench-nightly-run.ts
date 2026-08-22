import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import { resolveCommand, runCommand } from '../lib/run-command'

import { compareBenchReports } from './compare-bench-reports'
import { discoverBenchmarkedPackages } from './discover-benchmarked-packages'
import { formatBenchReport } from './format-bench-report'
import { resolveLatestTag } from './resolve-latest-tag'

import type { PackageBenchOutcome } from './format-bench-report'
import type { VitestBenchReport } from './vitest-bench-report.type'

const execFileAsync = promisify(execFile)

// Deliberately wide — a shared GitHub-hosted runner routinely shows 20-30%
// timing variance between two back-to-back runs of identical code, from
// noisy-neighbor CPU contention alone. A threshold anywhere near that would
// be mostly false alarms. 50% is chosen to sit comfortably above ordinary
// noise while still catching a real, meaningful regression — see
// CONTRIBUTING.md's Benchmarks section for why this workflow never fails
// the job regardless of what it finds.
const THRESHOLD_PERCENT = 50

const REPORT_PATH = 'reports/bench/summary.txt'

async function getAllTags(): Promise<string[]> {
  const { stdout } = await execFileAsync('git', ['tag', '-l'])

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

async function runBench(
  cwd: string,
  benchDirRelativeToCwd: string,
  outputJsonPath: string
): Promise<void> {
  const resolved = resolveCommand('pnpm')

  await execFileAsync(
    resolved.command,
    [
      ...resolved.argsPrefix,
      'exec',
      'vitest',
      'bench',
      '--run',
      benchDirRelativeToCwd,
      '--outputJson',
      outputJsonPath
    ],
    { cwd, maxBuffer: 1024 * 1024 * 64 }
  )
}

function readBenchReport(jsonPath: string): VitestBenchReport {
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as VitestBenchReport
}

async function buildAtWorktree(worktreeDir: string): Promise<void> {
  await runCommand('pnpm', ['install', '--frozen-lockfile'], { cwd: worktreeDir })
  await runCommand('pnpm', ['build'], { cwd: worktreeDir })
}

async function benchAtTag(
  tag: string,
  benchDirRelativeToRepoRoot: string,
  outputJsonPath: string
): Promise<void> {
  const worktreeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-nightly-worktree-'))

  try {
    await execFileAsync('git', ['worktree', 'add', '--detach', worktreeDir, tag])
    await buildAtWorktree(worktreeDir)
    await runBench(worktreeDir, benchDirRelativeToRepoRoot, outputJsonPath)
  } finally {
    await execFileAsync('git', ['worktree', 'remove', '--force', worktreeDir]).catch(() => {
      // Best-effort cleanup — a leftover worktree in the CI runner's temp
      // directory doesn't affect the report, and the runner is discarded
      // after the job regardless.
    })
  }
}

async function main(): Promise<void> {
  const packages = discoverBenchmarkedPackages('packages')
  const allTags = await getAllTags()

  const outcomes: PackageBenchOutcome[] = []

  await runCommand('pnpm', ['build'])

  for (const pkg of packages) {
    const tag = resolveLatestTag(allTags, pkg.name)

    if (!tag) {
      outcomes.push({ packageName: pkg.name, status: 'skipped-no-tag' })
      continue
    }

    const safeName = pkg.name.replace(/[/@]/g, '_')
    const baselineJsonPath = path.join(os.tmpdir(), `bench-baseline-${safeName}.json`)
    const currentJsonPath = path.join(os.tmpdir(), `bench-current-${safeName}.json`)

    await benchAtTag(tag, pkg.benchDir, baselineJsonPath)
    await runBench('.', pkg.benchDir, currentJsonPath)

    const baseline = readBenchReport(baselineJsonPath)
    const current = readBenchReport(currentJsonPath)

    outcomes.push({
      packageName: pkg.name,
      status: 'compared',
      baselineTag: tag,
      result: compareBenchReports(baseline, current, THRESHOLD_PERCENT)
    })
  }

  const report = formatBenchReport(outcomes, THRESHOLD_PERCENT)

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true })
  fs.writeFileSync(REPORT_PATH, report)

  console.log(report)
  console.log(`\nFull report written to ${REPORT_PATH}`)

  // Deliberately no exit(1) here even if `report` contains regressions — see
  // THRESHOLD_PERCENT's own comment. A regression is something to go look
  // at, not something that should block anything; the report is the whole
  // point, not a pass/fail gate. `main().catch` below still exits non-zero
  // for a genuine infrastructure failure (a broken build, a git command
  // that failed, an unparseable report) — that's a different kind of
  // problem than "the code got slower," and silently swallowing it would
  // let this whole check go dark without anyone noticing.
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
