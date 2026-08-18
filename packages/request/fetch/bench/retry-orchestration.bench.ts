import { bench, describe } from 'vitest'

import { handleRetry } from '../src/retry/retry'
import { createFetchOutcome } from '../src/shared/mocks/create-fetch-outcome'

import type { RetryConfig } from '../src/retry/retry-config.interface'

// retryDelay is deliberately 0/unset in every case here: a real delay just
// measures setTimeout, not this function's own overhead. The delay branch
// itself (`if (retryDelay > 0) await delay(retryDelay)`) is a single
// comparison either way.
const retryableConfig: RetryConfig = { retries: 3, retryOnStatuses: [503] }
const exhaustedConfig: RetryConfig = { retries: 0, retryOnStatuses: [503] }

const retryableOutcome = createFetchOutcome({ response: new Response(null, { status: 503 }) })

describe('handleRetry (fetch)', () => {
  bench('retryable, no delay configured', async () => {
    await handleRetry(retryableOutcome, 1, retryableConfig)
  })

  bench('retries exhausted, returns false immediately', async () => {
    await handleRetry(retryableOutcome, 1, exhaustedConfig)
  })
})
