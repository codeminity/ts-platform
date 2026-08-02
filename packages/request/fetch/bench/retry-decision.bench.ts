import { bench, describe } from 'vitest'

import { createFetchOutcome } from '../src/mocks/create-fetch-outcome'
import { shouldRetry } from '../src/retry/should-retry'

import type { RetryConfig } from '../src/retry/retry-config.interface'

const defaultConfig: RetryConfig = { retries: 3, retryOnStatuses: [429, 500, 502, 503] }
const customConfig: RetryConfig = {
  retries: 3,
  shouldRetry: (outcome) => outcome.error instanceof TypeError
}

const retryableOutcome = createFetchOutcome({ response: new Response(null, { status: 503 }) })
const nonRetryableOutcome = createFetchOutcome({ response: new Response(null, { status: 404 }) })
const networkErrorOutcome = createFetchOutcome({ error: new TypeError('network') })

describe('shouldRetry (fetch)', () => {
  bench('default policy, retryable status', () => {
    shouldRetry(retryableOutcome, 1, defaultConfig)
  })

  bench('default policy, non-retryable status', () => {
    shouldRetry(nonRetryableOutcome, 1, defaultConfig)
  })

  bench('default policy, retries exhausted', () => {
    shouldRetry(retryableOutcome, 4, defaultConfig)
  })

  bench('custom shouldRetry callback', () => {
    shouldRetry(networkErrorOutcome, 1, customConfig)
  })
})
