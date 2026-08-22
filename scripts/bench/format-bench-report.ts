import type { CompareBenchReportsResult } from './compare-bench-reports.js'

export type PackageBenchOutcome =
  | { packageName: string; status: 'skipped-no-tag' }
  | {
      packageName: string
      status: 'compared'
      baselineTag: string
      result: CompareBenchReportsResult
    }

function formatMs(ns: number): string {
  return `${(ns / 1_000_000).toFixed(3)}ms`
}

// Only called once `formatBenchReport` has already confirmed at least one
// regression exists across all outcomes — `outcomes.filter(...)` below is
// therefore guaranteed non-empty, never a defensive check against a case
// that can't happen at this call site.
function formatRegressionsSection(
  outcomes: Extract<PackageBenchOutcome, { status: 'compared' }>[]
): string[] {
  const withRegressions = outcomes.filter((outcome) => outcome.result.regressions.length > 0)

  const lines = ['⚠️  Regressions found:', '']

  for (const outcome of withRegressions) {
    lines.push(`${outcome.packageName} (baseline: ${outcome.baselineTag})`)

    for (const regression of outcome.result.regressions) {
      lines.push(`  ${regression.group} > ${regression.name}`)
      lines.push(
        `    ${regression.percentSlower.toFixed(1)}% slower ` +
          `(baseline: ${formatMs(regression.baselineMeanNs)}, current: ${formatMs(regression.currentMeanNs)})`
      )
    }

    lines.push('')
  }

  return lines
}

function formatPackageSummaryLines(outcomes: PackageBenchOutcome[]): string[] {
  return outcomes.map((outcome) => {
    if (outcome.status === 'skipped-no-tag') {
      return `⏭️  ${outcome.packageName} — skipped (no published tag yet)`
    }

    const count = outcome.result.regressions.length

    return count === 0
      ? `✅ ${outcome.packageName} — no regressions (baseline: ${outcome.baselineTag})`
      : `❌ ${outcome.packageName} — ${String(count)} regression(s) (baseline: ${outcome.baselineTag})`
  })
}

function formatAddedRemovedNote(
  outcomes: Extract<PackageBenchOutcome, { status: 'compared' }>[]
): string[] {
  const addedCount = outcomes.reduce((sum, outcome) => sum + outcome.result.currentOnly.length, 0)
  const removedCount = outcomes.reduce(
    (sum, outcome) => sum + outcome.result.baselineOnly.length,
    0
  )

  if (addedCount === 0 && removedCount === 0) return []

  return [
    '',
    `(${String(addedCount)} benchmark(s) newly added since baseline, ` +
      `${String(removedCount)} removed — not compared, informational only.)`
  ]
}

/**
 * Formats the per-package nightly bench comparison into a single report,
 * regressions first and impossible to miss, everything else compressed to
 * one line per package — meant to be readable at a glance from the
 * workflow artifact without re-running anything locally.
 *
 * @public
 */
export function formatBenchReport(
  outcomes: PackageBenchOutcome[],
  thresholdPercent: number
): string {
  const compared = outcomes.filter(
    (outcome): outcome is Extract<PackageBenchOutcome, { status: 'compared' }> =>
      outcome.status === 'compared'
  )

  const totalRegressions = compared.reduce(
    (sum, outcome) => sum + outcome.result.regressions.length,
    0
  )

  const lines: string[] = [
    `Nightly benchmark comparison — threshold ${String(thresholdPercent)}% slower than each package's own latest published tag.`,
    ''
  ]

  if (totalRegressions === 0) {
    lines.push('✅ No regressions past the threshold.', '')
  } else {
    lines.push(...formatRegressionsSection(compared))
  }

  lines.push(...formatPackageSummaryLines(outcomes))
  lines.push(...formatAddedRemovedNote(compared))

  return lines.join('\n')
}
