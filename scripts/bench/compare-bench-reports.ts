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

// `group.fullName` is Vitest's own `"<relative-file-path> > <describe name>"`
// string — relative to wherever Vitest was invoked from, so it's identical
// whether that invocation was the main checkout or a `git worktree` at a
// past tag, as long as the two mirror the same repo layout (which a full
// worktree checkout always does). `file.filepath`, by contrast, is an
// *absolute* path baked in by Vitest — different on every run purely
// because the worktree and the main checkout live at different absolute
// locations on disk. Keying on `filepath` (an earlier version of this
// function did) meant baseline and current entries for the exact same
// benchmark never matched at all — confirmed directly against a real
// nightly run, where every single benchmark showed up as both "removed"
// and "newly added" and nothing was ever actually compared.
function relativeFile(fullName: string): string {
  const separatorIndex = fullName.indexOf(' > ')

  return separatorIndex === -1 ? fullName : fullName.slice(0, separatorIndex)
}

// Below this absolute mean, a benchmark is measuring something so close to
// a no-op (a synchronous early-return, a single property check) that GC
// pauses, JIT state, and ordinary OS scheduler jitter dominate the
// measurement far more than any real behavior change could. At that scale a
// percentage is meaningless noise, not a signal — confirmed by a real
// nightly run flagging a "96.6% slower" regression where both the baseline
// and current mean rounded to 0.000ms; the actual values were well under a
// microsecond apart; a genuine regression in code this fast wouldn't move
// the needle on any real caller either.
const MIN_MEASURABLE_MEAN_NS = 10_000

function flatten(report: VitestBenchReport): Map<string, FlatBenchmark> {
  const flat = new Map<string, FlatBenchmark>()

  for (const file of report.files) {
    for (const group of file.groups) {
      for (const benchmark of group.benchmarks) {
        const key = `${group.fullName}::${benchmark.name}`

        flat.set(key, {
          file: relativeFile(group.fullName),
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
 * threshold isn't meaningful on that infrastructure. Below
 * `MIN_MEASURABLE_MEAN_NS`, a match is never classified as a regression
 * regardless of `percentSlower` — see that constant's own comment.
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

    const isRegression =
      percentSlower >= thresholdPercent && baselineEntry.mean >= MIN_MEASURABLE_MEAN_NS

    if (isRegression) {
      regressions.push(comparison)
    } else {
      withinThreshold.push(comparison)
    }
  }

  const currentOnly = [...currentFlat.keys()].filter((key) => !baselineFlat.has(key))

  return { regressions, withinThreshold, baselineOnly, currentOnly }
}
