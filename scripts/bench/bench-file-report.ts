import fs from 'node:fs'
import path from 'node:path'

import type { VitestBenchReport } from './vitest-bench-report.type.js'

export interface RecordedBenchmark {
  name: string
  meanNs: number
}

/**
 * Converts one `bench(...).run()` result's mean latency (milliseconds, per
 * Vitest 5's tinybench-native shape) to the nanosecond unit the rest of
 * this package's report/compare/format pipeline has always used (see
 * `MIN_MEASURABLE_MEAN_NS` in compare-bench-reports.ts).
 *
 * @public
 */
export function toMeanNs(meanMs: number): number {
  return meanMs * 1_000_000
}

/**
 * Builds one `VitestBenchReport.files[number]` entry from a bench file's
 * accumulated results — the file-level unit `compareBenchReports` and
 * `formatBenchReport` already consume, unchanged since before Vitest 5
 * removed `vitest bench --outputJson` (the single combined report this
 * package used to read directly instead of assembling the shape itself).
 *
 * @public
 */
export function buildBenchFileEntry(
  relativeFilePath: string,
  groupName: string,
  benchmarks: RecordedBenchmark[]
): VitestBenchReport['files'][number] {
  return {
    filepath: relativeFilePath,
    groups: [
      {
        fullName: `${relativeFilePath} > ${groupName}`,
        benchmarks: benchmarks.map((benchmark) => ({
          name: benchmark.name,
          mean: benchmark.meanNs
        }))
      }
    ]
  }
}

/**
 * Writes one bench file's report entry to `<outputDir>/<relativeFilePath
 * with path separators flattened>.json` — one JSON file per source bench
 * file, later merged by `collectBenchFileReports` into a single
 * `VitestBenchReport`. Each `*.bench.ts` file calls this once, from its own
 * top-level `afterAll`, after accumulating every `bench(...).run()` result
 * it registered.
 *
 * @public
 */
export function writeBenchFileReport(
  outputDir: string,
  relativeFilePath: string,
  groupName: string,
  benchmarks: RecordedBenchmark[]
): void {
  const entry = buildBenchFileEntry(relativeFilePath, groupName, benchmarks)
  const outPath = path.join(outputDir, `${relativeFilePath.replace(/[\\/]/g, '__')}.json`)

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(entry))
}

/**
 * Reads every per-file JSON `writeBenchFileReport` wrote under `dir` and
 * merges them back into one `VitestBenchReport`. Returns an empty report
 * (rather than throwing) when `dir` doesn't exist yet, so a first-ever run
 * with nothing benchmarked yet is a valid, empty result rather than an
 * error.
 *
 * @public
 */
export function collectBenchFileReports(dir: string): VitestBenchReport {
  if (!fs.existsSync(dir)) return { files: [] }

  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map(
      (name) =>
        JSON.parse(
          fs.readFileSync(path.join(dir, name), 'utf8')
        ) as VitestBenchReport['files'][number]
    )

  return { files }
}
