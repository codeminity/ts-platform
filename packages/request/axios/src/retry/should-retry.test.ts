import { AxiosError, type AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import { shouldRetry } from './should-retry'

import type { RetryConfig } from './retry-config.interface'

function createError(options?: { code?: string; status?: number }): AxiosError {
  const error = new AxiosError('error')

  if (options?.code) {
    error.code = options.code
  }

  if (options?.status != null) {
    error.response = {
      status: options.status,
      statusText: '',
      headers: {},
      config: {} as AxiosResponse['config'],
      data: undefined
    } as AxiosResponse
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

  it('honors a custom shouldRetry decision for status errors even without retryOnStatuses', () => {
    const error = createError({ status: 500 })

    const config: RetryConfig = {
      retries: 3,
      shouldRetry: () => true
    }

    expect(shouldRetry(error, 1, config)).toBe(true)
  })

  it('uses zero retries when retries is undefined', () => {
    const error = createError({ code: 'ERR_NETWORK' })

    expect(shouldRetry(error, 1, {})).toBe(false)
  })

  it('allows retry on first attempt when retries is configured', () => {
    const error = createError({ code: 'ERR_NETWORK' })

    expect(
      shouldRetry(error, 0, {
        retries: 1
      })
    ).toBe(true)
  })

  it('handles status retry config when retryOnStatuses is undefined', () => {
    const error = createError({ status: 500 })

    expect(
      shouldRetry(error, 1, {
        retries: 2
      })
    ).toBe(false)
  })

  it('does not retry when status is null and code is unknown', () => {
    const error = createError()

    expect(
      shouldRetry(error, 1, {
        retries: 2,
        retryOnStatuses: [500]
      })
    ).toBe(false)
  })

  it('calls custom shouldRetry with correct arguments', () => {
    const error = createError({ status: 500 })

    const custom = vi.fn().mockReturnValue(true)

    expect(
      shouldRetry(error, 2, {
        retries: 3,
        shouldRetry: custom
      })
    ).toBe(true)

    expect(custom).toHaveBeenCalledWith(error, 2)
  })

  it('does not retry when attempt equals retries+1', () => {
    const error = createError({ code: 'ERR_NETWORK' })

    expect(
      shouldRetry(error, 3, {
        retries: 2
      })
    ).toBe(false)
  })
})
