import { afterAll, describe, test } from 'vitest'

import { toMeanNs, writeBenchFileReport } from '../../../../scripts/bench/bench-file-report.js'
import { shouldRetry } from '../src/retry/should-retry'
import { createFetchOutcome } from '../src/shared/mocks/create-fetch-outcome'

import type { RecordedBenchmark } from '../../../../scripts/bench/bench-file-report.js'
import type { RetryConfig } from '../src/retry/retry-config.interface'

const FILE = 'packages/request/fetch/bench/retry-decision.bench.ts'
const GROUP = 'shouldRetry (fetch)'

const defaultConfig: RetryConfig = { retries: 3, retryOnStatuses: [429, 500, 502, 503] }
const customConfig: RetryConfig = {
  retries: 3,
  shouldRetry: (outcome) => outcome.error instanceof TypeError
}

const retryableOutcome = createFetchOutcome({ response: new Response(null, { status: 503 }) })
const nonRetryableOutcome = createFetchOutcome({ response: new Response(null, { status: 404 }) })
const networkErrorOutcome = createFetchOutcome({ error: new TypeError('network') })

describe(GROUP, () => {
  const recorded: RecordedBenchmark[] = []

  afterAll(() => {
    writeBenchFileReport(process.env.BENCH_REPORT_DIR ?? '.bench-results', FILE, GROUP, recorded)
  })

  test('default policy, retryable status', async ({ bench }) => {
    const result = await bench('default policy, retryable status', () => {
      shouldRetry(retryableOutcome, 1, defaultConfig)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('default policy, non-retryable status', async ({ bench }) => {
    const result = await bench('default policy, non-retryable status', () => {
      shouldRetry(nonRetryableOutcome, 1, defaultConfig)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('default policy, retries exhausted', async ({ bench }) => {
    const result = await bench('default policy, retries exhausted', () => {
      shouldRetry(retryableOutcome, 4, defaultConfig)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })

  test('custom shouldRetry callback', async ({ bench }) => {
    const result = await bench('custom shouldRetry callback', () => {
      shouldRetry(networkErrorOutcome, 1, customConfig)
    }).run()

    recorded.push({ name: result.name, meanNs: toMeanNs(result.latency.mean) })
  })
})
