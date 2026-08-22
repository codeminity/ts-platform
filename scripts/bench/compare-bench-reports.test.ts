import { describe, expect, it } from 'vitest'

import { compareBenchReports } from './compare-bench-reports'

import type { VitestBenchReport } from './vitest-bench-report.type'

function report(
  entries: { file?: string; group?: string; name: string; mean: number }[]
): VitestBenchReport {
  const files = new Map<string, Map<string, { name: string; mean: number }[]>>()

  for (const entry of entries) {
    const file = entry.file ?? 'default.bench.ts'
    const group = entry.group ?? 'default group'

    const groups = files.get(file) ?? new Map<string, { name: string; mean: number }[]>()
    files.set(file, groups)

    const benchmarks = groups.get(group) ?? []
    groups.set(group, benchmarks)

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
    const baseline = report([{ name: 'a', mean: 100 }])
    const current = report([{ name: 'a', mean: 120 }])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.regressions).toStrictEqual([])
    expect(result.withinThreshold).toStrictEqual([
      {
        file: 'default.bench.ts',
        group: 'default group',
        name: 'a',
        baselineMeanNs: 100,
        currentMeanNs: 120,
        percentSlower: 20
      }
    ])
  })

  it('buckets a matched benchmark past the threshold as a regression', () => {
    const baseline = report([{ name: 'a', mean: 100 }])
    const current = report([{ name: 'a', mean: 200 }])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.withinThreshold).toStrictEqual([])
    expect(result.regressions).toStrictEqual([
      {
        file: 'default.bench.ts',
        group: 'default group',
        name: 'a',
        baselineMeanNs: 100,
        currentMeanNs: 200,
        percentSlower: 100
      }
    ])
  })

  it('treats a percentSlower exactly at the threshold as a regression (inclusive boundary)', () => {
    const baseline = report([{ name: 'a', mean: 100 }])
    const current = report([{ name: 'a', mean: 150 }])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.regressions).toHaveLength(1)
    expect(result.withinThreshold).toStrictEqual([])
  })

  it('treats a faster current run (negative percentSlower) as withinThreshold', () => {
    const baseline = report([{ name: 'a', mean: 100 }])
    const current = report([{ name: 'a', mean: 40 }])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.regressions).toStrictEqual([])
    expect(result.withinThreshold).toStrictEqual([expect.objectContaining({ percentSlower: -60 })])
  })

  it('reports a baseline benchmark missing from current as baselineOnly', () => {
    const baseline = report([{ name: 'removed', mean: 100 }])
    const current = report([])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.baselineOnly).toStrictEqual(['default.bench.ts::default group::removed'])
    expect(result.currentOnly).toStrictEqual([])
    expect(result.regressions).toStrictEqual([])
    expect(result.withinThreshold).toStrictEqual([])
  })

  it('reports a current benchmark missing from baseline as currentOnly', () => {
    const baseline = report([])
    const current = report([{ name: 'added', mean: 100 }])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.currentOnly).toStrictEqual(['default.bench.ts::default group::added'])
    expect(result.baselineOnly).toStrictEqual([])
  })

  it('matches benchmarks by file+group+name identity, not by array position', () => {
    const baseline = report([
      { file: 'a.bench.ts', group: 'g1', name: 'x', mean: 100 },
      { file: 'b.bench.ts', group: 'g2', name: 'x', mean: 200 }
    ])
    // Same names, different files/groups, reversed order — identity must
    // still resolve each to its own counterpart, not the other one.
    const current = report([
      { file: 'b.bench.ts', group: 'g2', name: 'x', mean: 300 },
      { file: 'a.bench.ts', group: 'g1', name: 'x', mean: 110 }
    ])

    const result = compareBenchReports(baseline, current, 50)

    expect(result.regressions).toStrictEqual([
      expect.objectContaining({ file: 'b.bench.ts', group: 'g2', percentSlower: 50 })
    ])
    expect(result.withinThreshold).toStrictEqual([
      expect.objectContaining({ file: 'a.bench.ts', group: 'g1', percentSlower: 10 })
    ])
  })
})
