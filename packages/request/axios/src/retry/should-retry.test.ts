import { AxiosError, type AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import { shouldRetry } from './should-retry.js'

import type { RetryConfig } from './retry-config.interface.js'

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

describe(shouldRetry, () => {
  it('still allows retry when attempt equals retries (boundary)', () => {
    const error = createError({ code: 'ERR_NETWORK' })

    const config: RetryConfig = {
      retries: 1
    }

    expect(shouldRetry(error, 1, config)).toBe(true)
  })

  it('uses retryOnStatuses when status exists', () => {
    const error = createError({ status: 500 })

    const config: RetryConfig = {
      retries: 2,
      retryOnStatuses: [500, 502]
    }

    expect(shouldRetry(error, 1, config)).toBe(true)
  })

  it('retries on timeout errors', () => {
    const error = createError({ code: 'ECONNABORTED' })

    const config: RetryConfig = { retries: 2 }

    expect(shouldRetry(error, 1, config)).toBe(true)
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

    const custom = vi.fn<NonNullable<RetryConfig['shouldRetry']>>().mockReturnValue(true)

    expect(
      shouldRetry(error, 2, {
        retries: 3,
        shouldRetry: custom
      })
    ).toBe(true)

    expect(custom).toHaveBeenCalledWith(error, 2)
  })

  it('treats a NaN retries value as zero instead of retrying forever', () => {
    const error = createError({ code: 'ERR_NETWORK' })

    expect(
      shouldRetry(error, 1, {
        retries: NaN
      })
    ).toBe(false)
  })
})
