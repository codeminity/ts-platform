import { afterAll, describe, test } from 'vitest'

import { toMeanNs, writeBenchFileReport } from '../../../../scripts/bench/bench-file-report.js'
import { createRefreshQueue } from '../src/auth/create-refresh-queue'

import type { RecordedBenchmark } from '../../../../scripts/bench/bench-file-report.js'

const FILE = 'packages/request/core/bench/refresh-queue.bench.ts'
const GROUP = 'createRefreshQueue'

const noop = (): Promise<void> => Promise.resolve()

describe(GROUP, () => {
  const recorded: RecordedBenchmark[] = []

  afterAll(() => {
    writeBenchFileReport(process.env.BENCH_REPORT_DIR ?? '.bench-results', FILE, GROUP, recorded)
  })

  test('single sequential run()', async ({ bench }) => {
    const result = await bench('single sequential run()', async () => {
      const queue = createRefreshQueue()

      await queue.run(noop)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('10 concurrent run() calls (coalesced into one task)', async ({ bench }) => {
    const result = await bench('10 concurrent run() calls (coalesced into one task)', async () => {
      const queue = createRefreshQueue()

      await Promise.all(Array.from({ length: 10 }, () => queue.run(noop)))
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('10 sequential refresh cycles on the same queue', async ({ bench }) => {
    const result = await bench('10 sequential refresh cycles on the same queue', async () => {
      const queue = createRefreshQueue()

      for (let i = 0; i < 10; i++) {
        await queue.run(noop)
      }
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })
})
