import { AxiosError, type AxiosResponse } from 'axios'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { shouldRetry } from './should-retry'

function errorWithStatus(status: number | undefined): AxiosError {
  const error = new AxiosError('error')

  if (status != null) {
    error.response = {
      status,
      statusText: '',
      headers: {},
      config: {} as AxiosResponse['config'],
      data: undefined
    } as AxiosResponse
  }

  return error
}

describe('shouldRetry (property-based)', () => {
  it('never retries once attempt exceeds retries, regardless of status or a custom shouldRetry override', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        fc.option(fc.integer({ min: 100, max: 599 }), { nil: undefined }),
        (retries, attempt, status) => {
          fc.pre(attempt > retries)

          const result = shouldRetry(errorWithStatus(status), attempt, {
            retries,
            // Even a config that would otherwise always allow retrying must
            // not override the attempt/retries boundary — this is checked
            // first in the implementation, by design.
            shouldRetry: () => true,
            ...(status != null ? { retryOnStatuses: [status] } : {})
          })

          expect(result).toBe(false)
        }
      )
    )
  })

  it('a status in retryOnStatuses is retried whenever attempt is within budget and no custom shouldRetry is set', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 100, max: 599 }),
        (retries, status) => {
          const attempt = retries

          const result = shouldRetry(errorWithStatus(status), attempt, {
            retries,
            retryOnStatuses: [status]
          })

          expect(result).toBe(true)
        }
      )
    )
  })
})
