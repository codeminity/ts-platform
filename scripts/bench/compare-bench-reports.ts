import type { VitestBenchReport } from './vitest-bench-report.type.js'

/**
 * One benchmark, matched by identity (file + group + name) across a
 * baseline and current report.
 */
export interface BenchComparison {
  file: string
  group: string
  name: string
  baselineMeanNs: number
  currentMeanNs: number
  /** Positive means slower than baseline; negative means faster. */
  percentSlower: number
}

export interface CompareBenchReportsResult {
  /** Matched benchmarks at or past `thresholdPercent` slower than baseline. */
  regressions: BenchComparison[]
  /** Matched benchmarks within the threshold either way. */
  withinThreshold: BenchComparison[]
  /** Present in the baseline report but not the current one (e.g. removed). */
  baselineOnly: string[]
  /** Present in the current report but not the baseline (e.g. newly added). */
  currentOnly: string[]
}

interface FlatBenchmark {
  file: string
  group: string
  name: string
  mean: number
}

function flatten(report: VitestBenchReport): Map<string, FlatBenchmark> {
  const flat = new Map<string, FlatBenchmark>()

  for (const file of report.files) {
    for (const group of file.groups) {
      for (const benchmark of group.benchmarks) {
        const key = `${file.filepath}::${group.fullName}::${benchmark.name}`

        flat.set(key, {
          file: file.filepath,
          group: group.fullName,
          name: benchmark.name,
          mean: benchmark.mean
        })
      }
    }
  }

  return flat
}

/**
 * Matches every benchmark in `baseline` against `current` by identity (file
 * + group + name — not by array position, which reordering or an unrelated
 * benchmark addition would silently break), and buckets each match as a
 * regression or not based on `thresholdPercent`. A deliberately wide
 * threshold (this project uses 50%) absorbs ordinary shared-CI-runner
 * timing noise — see `bench-nightly-run.ts`'s own comment for why a tight
 * threshold isn't meaningful on that infrastructure.
 *
 * @public
 */
export function compareBenchReports(
  baseline: VitestBenchReport,
  current: VitestBenchReport,
  thresholdPercent: number
): CompareBenchReportsResult {
  const baselineFlat = flatten(baseline)
  const currentFlat = flatten(current)

  const regressions: BenchComparison[] = []
  const withinThreshold: BenchComparison[] = []
  const baselineOnly: string[] = []

  for (const [key, baselineEntry] of baselineFlat) {
    const currentEntry = currentFlat.get(key)

    if (!currentEntry) {
      baselineOnly.push(key)
      continue
    }

    const percentSlower = ((currentEntry.mean - baselineEntry.mean) / baselineEntry.mean) * 100

    const comparison: BenchComparison = {
      file: baselineEntry.file,
      group: baselineEntry.group,
      name: baselineEntry.name,
      baselineMeanNs: baselineEntry.mean,
      currentMeanNs: currentEntry.mean,
      percentSlower
    }

    if (percentSlower >= thresholdPercent) {
      regressions.push(comparison)
    } else {
      withinThreshold.push(comparison)
    }
  }

  const currentOnly = [...currentFlat.keys()].filter((key) => !baselineFlat.has(key))

  return { regressions, withinThreshold, baselineOnly, currentOnly }
}
