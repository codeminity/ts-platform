import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  buildBenchFileEntry,
  collectBenchFileReports,
  toMeanNs,
  writeBenchFileReport
} from './bench-file-report'

let tempDir: string | undefined

function createTempDir(): string {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-file-report-test-'))

  return tempDir
}

describe(toMeanNs, () => {
  it('converts a millisecond mean to nanoseconds', () => {
    expect(toMeanNs(0.001)).toBe(1000)
  })
})

describe(buildBenchFileEntry, () => {
  it('builds one file entry with a single group carrying all benchmarks', () => {
    expect(
      buildBenchFileEntry('packages/request/axios/bench/x.bench.ts', 'someGroup', [
        { name: 'first', meanNs: 100 },
        { name: 'second', meanNs: 200 }
      ])
    ).toStrictEqual({
      filepath: 'packages/request/axios/bench/x.bench.ts',
      groups: [
        {
          fullName: 'packages/request/axios/bench/x.bench.ts > someGroup',
          benchmarks: [
            { name: 'first', mean: 100 },
            { name: 'second', mean: 200 }
          ]
        }
      ]
    })
  })
})

describe(writeBenchFileReport, () => {
  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true })
      tempDir = undefined
    }
  })

  it('writes a file entry to a flattened, collision-safe filename under outputDir', () => {
    const dir = createTempDir()

    writeBenchFileReport(dir, 'packages/request/axios/bench/x.bench.ts', 'g', [
      { name: 'n', meanNs: 42 }
    ])

    const writtenFilename = 'packages__request__axios__bench__x.bench.ts.json'

    expect(fs.readdirSync(dir)).toStrictEqual([writtenFilename])
    expect(
      JSON.parse(fs.readFileSync(path.join(dir, writtenFilename), 'utf8')) as unknown
    ).toStrictEqual(
      buildBenchFileEntry('packages/request/axios/bench/x.bench.ts', 'g', [
        { name: 'n', meanNs: 42 }
      ])
    )
  })

  it('creates outputDir when it does not exist yet', () => {
    const dir = path.join(createTempDir(), 'nested', 'reports')

    writeBenchFileReport(dir, 'f.bench.ts', 'g', [{ name: 'n', meanNs: 1 }])

    expect(fs.existsSync(dir)).toBe(true)
  })
})

describe(collectBenchFileReports, () => {
  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true })
      tempDir = undefined
    }
  })

  it('merges every per-file JSON under dir into one report', () => {
    const dir = createTempDir()

    writeBenchFileReport(dir, 'packages/a/bench/x.bench.ts', 'gA', [{ name: 'nA', meanNs: 1 }])
    writeBenchFileReport(dir, 'packages/b/bench/y.bench.ts', 'gB', [{ name: 'nB', meanNs: 2 }])

    const report = collectBenchFileReports(dir)

    expect(report.files).toHaveLength(2)
    expect(report.files.map((file) => file.filepath).sort()).toStrictEqual([
      'packages/a/bench/x.bench.ts',
      'packages/b/bench/y.bench.ts'
    ])
  })

  it('ignores non-JSON files under dir', () => {
    const dir = createTempDir()

    writeBenchFileReport(dir, 'f.bench.ts', 'g', [{ name: 'n', meanNs: 1 }])
    fs.writeFileSync(path.join(dir, 'README.md'), 'not a report')

    expect(collectBenchFileReports(dir).files).toHaveLength(1)
  })

  it('returns an empty report when dir does not exist', () => {
    expect(collectBenchFileReports(path.join(os.tmpdir(), 'does-not-exist-at-all'))).toStrictEqual({
      files: []
    })
  })
})
