import { afterAll, describe, test } from 'vitest'

import { toMeanNs, writeBenchFileReport } from '../../../../scripts/bench/bench-file-report.js'
import { handleRetry } from '../src/retry/retry'
import { createFetchOutcome } from '../src/shared/mocks/create-fetch-outcome'

import type { RecordedBenchmark } from '../../../../scripts/bench/bench-file-report.js'
import type { RetryConfig } from '../src/retry/retry-config.interface'

const FILE = 'packages/request/fetch/bench/retry-orchestration.bench.ts'
const GROUP = 'handleRetry (fetch)'

// retryDelay is deliberately 0/unset in every case here: a real delay just
// measures setTimeout, not this function's own overhead. The delay branch
// itself (`if (retryDelay > 0) await delay(retryDelay)`) is a single
// comparison either way.
const retryableConfig: RetryConfig = { retries: 3, retryOnStatuses: [503] }
const exhaustedConfig: RetryConfig = { retries: 0, retryOnStatuses: [503] }

const retryableOutcome = createFetchOutcome({ response: new Response(null, { status: 503 }) })

describe(GROUP, () => {
  const recorded: RecordedBenchmark[] = []

  afterAll(() => {
    writeBenchFileReport(process.env.BENCH_REPORT_DIR ?? '.bench-results', FILE, GROUP, recorded)
  })

  test('retryable, no delay configured', async ({ bench }) => {
    const result = await bench('retryable, no delay configured', async () => {
      await handleRetry(retryableOutcome, 1, retryableConfig)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('retries exhausted, returns false immediately', async ({ bench }) => {
    const result = await bench('retries exhausted, returns false immediately', async () => {
      await handleRetry(retryableOutcome, 1, exhaustedConfig)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })
})
