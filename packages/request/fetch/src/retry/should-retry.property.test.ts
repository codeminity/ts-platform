import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { createFetchOutcome } from '../mocks/create-fetch-outcome.js'

import { shouldRetry } from './should-retry.js'

function statusOutcome(status: number) {
  return createFetchOutcome({ response: new Response(null, { status }) })
}

describe('shouldRetry (property-based)', () => {
  it('never retries once attempt exceeds retries, regardless of status or a custom shouldRetry override', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 200, max: 599 }),
        (retries, attempt, status) => {
          fc.pre(attempt > retries)

          const result = shouldRetry(statusOutcome(status), attempt, {
            retries,
            // Even a config that would otherwise always allow retrying must
            // not override the attempt/retries boundary — this is checked
            // first in the implementation, by design.
            shouldRetry: () => true,
            retryOnStatuses: [status]
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
        fc.integer({ min: 200, max: 599 }),
        (retries, status) => {
          const attempt = retries

          const result = shouldRetry(statusOutcome(status), attempt, {
            retries,
            retryOnStatuses: [status]
          })

          expect(result).toBe(true)
        }
      )
    )
  })
})
