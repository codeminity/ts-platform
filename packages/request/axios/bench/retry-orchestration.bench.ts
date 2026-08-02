import { AxiosError } from 'axios'
import { bench, describe } from 'vitest'

import { handleRetry } from '../src/retry/retry'

import type { RetryConfig } from '../src/retry/retry-config.interface'

function errorWithStatus(status: number): AxiosError {
  const error = new AxiosError('error')

  error.response = { status, statusText: '', headers: {}, config: {}, data: undefined } as never

  return error
}

// retryDelay is deliberately 0/unset in every case here: a real delay just
// measures setTimeout, not this function's own overhead. The delay branch
// itself (`if (retryDelay > 0) await delay(retryDelay)`) is a single
// comparison either way.
const retryableConfig: RetryConfig = { retries: 3, retryOnStatuses: [503] }
const exhaustedConfig: RetryConfig = { retries: 0, retryOnStatuses: [503] }

const retryableError = errorWithStatus(503)

describe('handleRetry (axios)', () => {
  bench('retryable, no delay configured', async () => {
    await handleRetry(retryableError, 1, retryableConfig)
  })

  bench('retries exhausted, returns false immediately', async () => {
    await handleRetry(retryableError, 1, exhaustedConfig)
  })
})
