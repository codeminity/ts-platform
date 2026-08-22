import { describe, expect, it } from 'vitest'

import { formatBenchReport } from './format-bench-report'

import type { PackageBenchOutcome } from './format-bench-report'

function comparedOutcome(
  packageName: string,
  overrides: Partial<PackageBenchOutcome & { status: 'compared' }> = {}
): Extract<PackageBenchOutcome, { status: 'compared' }> {
  return {
    packageName,
    status: 'compared',
    baselineTag: `${packageName}@1.0.0`,
    result: { regressions: [], withinThreshold: [], baselineOnly: [], currentOnly: [] },
    ...overrides
  }
}

describe(formatBenchReport, () => {
  it('reports "no regressions" and one ✅ line per package when everything is within threshold', () => {
    const report = formatBenchReport(
      [comparedOutcome('@codeminity/axios'), comparedOutcome('@codeminity/fetch')],
      50
    )

    expect(report).toContain('✅ No regressions past the threshold.')
    expect(report).toContain(
      '✅ @codeminity/axios — no regressions (baseline: @codeminity/axios@1.0.0)'
    )
    expect(report).toContain(
      '✅ @codeminity/fetch — no regressions (baseline: @codeminity/fetch@1.0.0)'
    )
    expect(report).not.toContain('⚠️')
  })

  it('lists a regression with its group, name, percentage, and both mean times', () => {
    const outcome = comparedOutcome('@codeminity/axios', {
      result: {
        regressions: [
          {
            file: 'packages/request/axios/bench/attach-auth.bench.ts',
            group: 'attachAuthInterceptor',
            name: 'with getToken configured',
            baselineMeanNs: 420_000,
            currentMeanNs: 680_000,
            percentSlower: 61.9
          }
        ],
        withinThreshold: [],
        baselineOnly: [],
        currentOnly: []
      }
    })

    const report = formatBenchReport([outcome], 50)

    expect(report).toContain('⚠️  Regressions found:')
    expect(report).toContain('@codeminity/axios (baseline: @codeminity/axios@1.0.0)')
    expect(report).toContain('attachAuthInterceptor > with getToken configured')
    expect(report).toContain('61.9% slower (baseline: 0.420ms, current: 0.680ms)')
    expect(report).toContain(
      '❌ @codeminity/axios — 1 regression(s) (baseline: @codeminity/axios@1.0.0)'
    )
  })

  it('only lists packages that actually have a regression under "Regressions found", not every compared package', () => {
    const regressed = comparedOutcome('@codeminity/axios', {
      result: {
        regressions: [
          {
            file: 'f.bench.ts',
            group: 'g',
            name: 'n',
            baselineMeanNs: 100,
            currentMeanNs: 200,
            percentSlower: 100
          }
        ],
        withinThreshold: [],
        baselineOnly: [],
        currentOnly: []
      }
    })
    const clean = comparedOutcome('@codeminity/fetch')

    const report = formatBenchReport([regressed, clean], 50)

    const regressionsSectionEnd = report.indexOf('✅ @codeminity/fetch')
    const regressionsSection = report.slice(0, regressionsSectionEnd)

    expect(regressionsSection).toContain('@codeminity/axios')
    expect(regressionsSection).not.toContain('@codeminity/fetch')
  })

  it('marks a package with no published tag as skipped, not compared', () => {
    const report = formatBenchReport(
      [{ packageName: '@codeminity/ui-kit', status: 'skipped-no-tag' }],
      50
    )

    expect(report).toContain('⏭️  @codeminity/ui-kit — skipped (no published tag yet)')
  })

  it('adds no added/removed note when nothing was added or removed', () => {
    const report = formatBenchReport([comparedOutcome('@codeminity/axios')], 50)

    expect(report).not.toContain('newly added')
  })

  it('notes newly added and removed benchmark counts across all compared packages', () => {
    const outcome = comparedOutcome('@codeminity/axios', {
      result: {
        regressions: [],
        withinThreshold: [],
        baselineOnly: ['old-bench'],
        currentOnly: ['new-bench-1', 'new-bench-2']
      }
    })

    const report = formatBenchReport([outcome], 50)

    expect(report).toContain('2 benchmark(s) newly added since baseline, 1 removed')
  })

  it('includes the configured threshold percentage in the header', () => {
    const report = formatBenchReport([comparedOutcome('@codeminity/axios')], 75)

    expect(report).toContain('threshold 75% slower')
  })
})
