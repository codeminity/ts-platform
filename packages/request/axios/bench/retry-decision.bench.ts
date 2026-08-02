import { AxiosError } from 'axios'
import { bench, describe } from 'vitest'

import { shouldRetry } from '../src/retry/should-retry'

import type { RetryConfig } from '../src/retry/retry-config.interface'

function errorWithStatus(status: number): AxiosError {
  const error = new AxiosError('error')

  error.response = { status, statusText: '', headers: {}, config: {}, data: undefined } as never

  return error
}

const defaultConfig: RetryConfig = { retries: 3, retryOnStatuses: [429, 500, 502, 503] }
const customConfig: RetryConfig = {
  retries: 3,
  shouldRetry: (error) => error.code === 'ERR_NETWORK'
}

const retryableError = errorWithStatus(503)
const nonRetryableError = errorWithStatus(404)
const networkError = Object.assign(new AxiosError('network'), { code: 'ERR_NETWORK' })

describe('shouldRetry (axios)', () => {
  bench('default policy, retryable status', () => {
    shouldRetry(retryableError, 1, defaultConfig)
  })

  bench('default policy, non-retryable status', () => {
    shouldRetry(nonRetryableError, 1, defaultConfig)
  })

  bench('default policy, retries exhausted', () => {
    shouldRetry(retryableError, 4, defaultConfig)
  })

  bench('custom shouldRetry callback', () => {
    shouldRetry(networkError, 1, customConfig)
  })
})
