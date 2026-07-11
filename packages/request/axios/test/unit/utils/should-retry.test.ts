import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'

import { type RetryConfig } from '../../../src/interfaces/retry-config'
import { shouldRetry } from '../../../src/utils/should-retry'

function createError(options?: { code?: string; status?: number }): AxiosError {
  const error = new AxiosError('error')

  if (options?.code) {
    error.code = options.code
  }

  if (options?.status != null) {
    error.response = {
      status: options.status
    } as AxiosError['response']
  }

  return error
}

describe('shouldRetry', () => {
  it('returns false when attempt exceeds retries', () => {
    const error = createError({ code: 'ERR_NETWORK' })

    const config: RetryConfig = {
      retries: 1
    }

    expect(shouldRetry(error, 2, config)).toBe(false)
  })

  it('uses custom shouldRetry as filter with valid retry context', () => {
    const error = createError({ code: 'ERR_NETWORK' })

    const config: RetryConfig = {
      retries: 2,
      shouldRetry: () => true
    }

    expect(shouldRetry(error, 1, config)).toBe(true)
  })

  it('blocks retry if custom shouldRetry returns false', () => {
    const error = createError({ code: 'ERR_NETWORK' })

    const config: RetryConfig = {
      retries: 2,
      shouldRetry: () => false
    }

    expect(shouldRetry(error, 1, config)).toBe(false)
  })

  it('uses retryOnStatuses when status exists', () => {
    const error = createError({ status: 500 })

    const config: RetryConfig = {
      retries: 2,
      retryOnStatuses: [500, 502]
    }

    expect(shouldRetry(error, 1, config)).toBe(true)
  })

  it('returns false when status not in retryOnStatuses', () => {
    const error = createError({ status: 404 })

    const config: RetryConfig = {
      retries: 2,
      retryOnStatuses: [500]
    }

    expect(shouldRetry(error, 1, config)).toBe(false)
  })

  it('retries on network errors', () => {
    const error = createError({ code: 'ERR_NETWORK' })

    const config: RetryConfig = { retries: 2 }

    expect(shouldRetry(error, 1, config)).toBe(true)
  })

  it('retries on timeout errors', () => {
    const error = createError({ code: 'ECONNABORTED' })

    const config: RetryConfig = { retries: 2 }

    expect(shouldRetry(error, 1, config)).toBe(true)
  })

  it('returns false for unknown errors without status or code', () => {
    const error = createError()

    const config: RetryConfig = { retries: 2 }

    expect(shouldRetry(error, 1, config)).toBe(false)
  })
})
