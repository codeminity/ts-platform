import { describe, expect, it } from 'vitest'

import { compareBenchReports } from './compare-bench-reports'

import type { VitestBenchReport } from './vitest-bench-report.type'

// Mirrors real Vitest bench JSON: `fullName` is `"<relative file> > <describe
// block>"`, relative to wherever Vitest was invoked from — `filepath` is a
// separate, *absolute* path Vitest also reports, which this helper lets
// tests set independently of `fullName` specifically to reproduce the real
// bug this module was fixed for (see compare-bench-reports.ts's own
// comment): two runs of the identical benchmark from two different
// absolute working directories (a `git worktree` vs. the main checkout).
function report(
  entries: {
    filepath?: string
    file?: string
    group?: string
    name: string
    mean: number
  }[]
): VitestBenchReport {
  const files = new Map<string, Map<string, { name: string; mean: number }[]>>()

  for (const entry of entries) {
    const filepath = entry.filepath ?? '/abs/path/default.bench.ts'
    const relativeFile = entry.file ?? 'default.bench.ts'
    const group = entry.group ?? 'default group'
    const fullName = `${relativeFile} > ${group}`

    const groups = files.get(filepath) ?? new Map<string, { name: string; mean: number }[]>()
    files.set(filepath, groups)

    const benchmarks = groups.get(fullName) ?? []
    groups.set(fullName, benchmarks)

    benchmarks.push({ name: entry.name, mean: entry.mean })
  }

  return {
    files: [...files.entries()].map(([filepath, groups]) => ({
      filepath,
      groups: [...groups.entries()].map(([fullName, benchmarks]) => ({ fullName, benchmarks }))
    }))
  }
}

describe(compareBenchReports, () => {
  it('buckets a matched benchmark under threshold as withinThreshold, not a regression', () => {
    const baseline = report([{ name: 'a', mean: 100_000 }])
    const current = report([{ name: 'a', mean: 120_000 }])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.regressions).toStrictEqual([])
    expect(result.withinThreshold).toStrictEqual([
      {
        file: 'default.bench.ts',
        group: 'default.bench.ts > default group',
        name: 'a',
        baselineMeanNs: 100_000,
        currentMeanNs: 120_000,
        percentSlower: 20
      }
    ])
  })

  it('never classifies a match as a regression when the baseline mean is below the measurable floor', () => {
    // Mirrors the real false positive this floor was added for: a
    // near-instant synchronous benchmark where GC/JIT/scheduler noise alone
    // produces a huge percentage swing between two absolute values that are
    // both effectively zero.
    const baseline = report([{ name: 'a', mean: 500 }])
    const current = report([{ name: 'a', mean: 1_000 }])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.regressions).toStrictEqual([])
    expect(result.withinThreshold).toStrictEqual([expect.objectContaining({ percentSlower: 100 })])
  })

  it('matches the same benchmark even when its absolute filepath differs between runs', () => {
    // The exact real-world bug: a `git worktree` baseline run and the main
    // checkout's current run report the identical benchmark under two
    // different absolute paths, since Vitest resolves `filepath` against
    // wherever it was actually invoked from. Only `fullName` (already
    // relative) and the benchmark name should matter for matching.
    const baseline = report([
      {
        filepath: '/tmp/bench-nightly-worktree-abc123/packages/request/core/bench/f.bench.ts',
        name: 'a',
        mean: 100_000
      }
    ])
    const current = report([
      {
        filepath:
          '/home/runner/work/ts-platform/ts-platform/packages/request/core/bench/f.bench.ts',
        name: 'a',
        mean: 120_000
      }
    ])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.baselineOnly).toStrictEqual([])
    expect(result.currentOnly).toStrictEqual([])
    expect(result.withinThreshold).toStrictEqual([expect.objectContaining({ percentSlower: 20 })])
  })

  it('buckets a matched benchmark past the threshold as a regression', () => {
    const baseline = report([{ name: 'a', mean: 100_000 }])
    const current = report([{ name: 'a', mean: 200_000 }])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.withinThreshold).toStrictEqual([])
    expect(result.regressions).toStrictEqual([
      {
        file: 'default.bench.ts',
        group: 'default.bench.ts > default group',
        name: 'a',
        baselineMeanNs: 100_000,
        currentMeanNs: 200_000,
        percentSlower: 100
      }
    ])
  })

  it('treats a percentSlower exactly at the threshold as a regression (inclusive boundary)', () => {
    const baseline = report([{ name: 'a', mean: 100_000 }])
    const current = report([{ name: 'a', mean: 150_000 }])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.regressions).toHaveLength(1)
    expect(result.withinThreshold).toStrictEqual([])
  })

  it('treats a faster current run (negative percentSlower) as withinThreshold', () => {
    const baseline = report([{ name: 'a', mean: 100_000 }])
    const current = report([{ name: 'a', mean: 40_000 }])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.regressions).toStrictEqual([])
    expect(result.withinThreshold).toStrictEqual([expect.objectContaining({ percentSlower: -60 })])
  })

  it('reports a baseline benchmark missing from current as baselineOnly', () => {
    const baseline = report([{ name: 'removed', mean: 100_000 }])
    const current = report([])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.baselineOnly).toStrictEqual(['default.bench.ts > default group::removed'])
    expect(result.currentOnly).toStrictEqual([])
    expect(result.regressions).toStrictEqual([])
    expect(result.withinThreshold).toStrictEqual([])
  })

  it('reports a current benchmark missing from baseline as currentOnly', () => {
    const baseline = report([])
    const current = report([{ name: 'added', mean: 100_000 }])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.currentOnly).toStrictEqual(['default.bench.ts > default group::added'])
    expect(result.baselineOnly).toStrictEqual([])
  })

  it('matches benchmarks by group+name identity, not by array position', () => {
    const baseline = report([
      { file: 'a.bench.ts', group: 'g1', name: 'x', mean: 100_000 },
      { file: 'b.bench.ts', group: 'g2', name: 'x', mean: 200_000 }
    ])
    // Same names, different files/groups, reversed order — identity must
    // still resolve each to its own counterpart, not the other one.
    const current = report([
      { file: 'b.bench.ts', group: 'g2', name: 'x', mean: 300_000 },
      { file: 'a.bench.ts', group: 'g1', name: 'x', mean: 110_000 }
    ])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.regressions).toStrictEqual([
      expect.objectContaining({ file: 'b.bench.ts', percentSlower: 50 })
    ])
    expect(result.withinThreshold).toStrictEqual([
      expect.objectContaining({ file: 'a.bench.ts', percentSlower: 10 })
    ])
  })

  it('uses the whole fullName as the displayed file when it has no " > " group separator', () => {
    const files: VitestBenchReport = {
      files: [
        {
          filepath: '/abs/whatever.bench.ts',
          groups: [{ fullName: 'no-separator-name', benchmarks: [{ name: 'a', mean: 100_000 }] }]
        }
      ]
    }

    const result = compareBenchReports(files, files, 50)

    expect(result.withinThreshold).toStrictEqual([
      expect.objectContaining({ file: 'no-separator-name', group: 'no-separator-name' })
    ])
  })
})
