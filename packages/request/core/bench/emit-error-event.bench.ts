import { afterAll, describe, test } from 'vitest'

import { toMeanNs, writeBenchFileReport } from '../../../../scripts/bench/bench-file-report.js'
import { emitterCallback } from '../src/errors/emit-error-event'

import type { RecordedBenchmark } from '../../../../scripts/bench/bench-file-report.js'

const FILE = 'packages/request/core/bench/emit-error-event.bench.ts'
const GROUP = 'emitterCallback'

const noop = (): void => {
  /* no-op, for benchmarking bare callback-invocation overhead */
}

describe(GROUP, () => {
  const recorded: RecordedBenchmark[] = []

  afterAll(() => {
    writeBenchFileReport(process.env.BENCH_REPORT_DIR ?? '.bench-results', FILE, GROUP, recorded)
  })

  test('both onEvent and onError provided', async ({ bench }) => {
    const result = await bench('both onEvent and onError provided', async () => {
      await emitterCallback('event', { code: 1 }, { onEvent: noop, onError: noop })
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('neither callback provided', async ({ bench }) => {
    const result = await bench('neither callback provided', async () => {
      await emitterCallback('event', { code: 1 }, {})
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('onEvent throws, swallowed', async ({ bench }) => {
    const result = await bench('onEvent throws, swallowed', async () => {
      await emitterCallback(
        'event',
        { code: 1 },
        {
          onEvent: () => {
            throw new Error('callback failure')
          }
        }
      )
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })
})
