import { describe, expect, it, vi } from 'vitest'

import { createFetchOutcome } from '../shared/mocks/create-fetch-outcome.js'

import { shouldRetry } from './should-retry.js'

import type { RetryConfig } from './retry-config.interface.js'
import type { FetchOutcome } from '../errors/fetch-outcome.interface.js'

function networkOutcome(): FetchOutcome {
  return createFetchOutcome({ error: new TypeError('fetch failed') })
}

function timeoutOutcome(): FetchOutcome {
  return createFetchOutcome({ error: new DOMException('timed out', 'TimeoutError') })
}

function abortOutcome(): FetchOutcome {
  return createFetchOutcome({ error: new DOMException('aborted', 'AbortError') })
}

function statusOutcome(status: number): FetchOutcome {
  return createFetchOutcome({ response: new Response(null, { status }) })
}

describe(shouldRetry, () => {
  it('uses retryOnStatuses when a response exists', () => {
    const config: RetryConfig = { retries: 2, retryOnStatuses: [500, 502] }

    expect(shouldRetry(statusOutcome(500), 1, config)).toBe(true)
  })

  it('returns false for a response outcome with no retryOnStatuses configured', () => {
    expect(shouldRetry(statusOutcome(500), 1, { retries: 2 })).toBe(false)
  })

  it('retries on timeout errors by default', () => {
    expect(shouldRetry(timeoutOutcome(), 1, { retries: 2 })).toBe(true)
  })

  it('does not retry on user-initiated abort by default', () => {
    expect(shouldRetry(abortOutcome(), 1, { retries: 2 })).toBe(false)
  })

  it('allows retry on first attempt when retries is configured', () => {
    expect(shouldRetry(networkOutcome(), 1, { retries: 1 })).toBe(true)
  })

  it('calls custom shouldRetry with correct arguments', () => {
    const outcome = statusOutcome(500)
    const custom = vi.fn<NonNullable<RetryConfig['shouldRetry']>>().mockReturnValue(true)

    expect(shouldRetry(outcome, 2, { retries: 3, shouldRetry: custom })).toBe(true)
    expect(custom).toHaveBeenCalledWith(outcome, 2)
  })

  it('treats a NaN retries value as zero instead of retrying forever', () => {
    expect(shouldRetry(networkOutcome(), 1, { retries: NaN })).toBe(false)
  })
})
