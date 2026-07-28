import { describe, expect, it, vi } from 'vitest'

import { createFetchOutcome } from '../mocks/create-fetch-outcome'

import { shouldRetry } from './should-retry'

import type { RetryConfig } from './retry-config.interface'
import type { FetchOutcome } from '../errors/fetch-outcome.interface'

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

describe('shouldRetry', () => {
  it('returns false when attempt exceeds retries', () => {
    const config: RetryConfig = { retries: 1 }

    expect(shouldRetry(networkOutcome(), 2, config)).toBe(false)
  })

  it('uses custom shouldRetry as filter with valid retry context', () => {
    const config: RetryConfig = { retries: 2, shouldRetry: () => true }

    expect(shouldRetry(networkOutcome(), 1, config)).toBe(true)
  })

  it('blocks retry if custom shouldRetry returns false', () => {
    const config: RetryConfig = { retries: 2, shouldRetry: () => false }

    expect(shouldRetry(networkOutcome(), 1, config)).toBe(false)
  })

  it('uses retryOnStatuses when a response exists', () => {
    const config: RetryConfig = { retries: 2, retryOnStatuses: [500, 502] }

    expect(shouldRetry(statusOutcome(500), 1, config)).toBe(true)
  })

  it('returns false when status not in retryOnStatuses', () => {
    const config: RetryConfig = { retries: 2, retryOnStatuses: [500] }

    expect(shouldRetry(statusOutcome(404), 1, config)).toBe(false)
  })

  it('returns false for a response outcome with no retryOnStatuses configured', () => {
    expect(shouldRetry(statusOutcome(500), 1, { retries: 2 })).toBe(false)
  })

  it('retries on network errors by default', () => {
    expect(shouldRetry(networkOutcome(), 1, { retries: 2 })).toBe(true)
  })

  it('retries on timeout errors by default', () => {
    expect(shouldRetry(timeoutOutcome(), 1, { retries: 2 })).toBe(true)
  })

  it('does not retry on user-initiated abort by default', () => {
    expect(shouldRetry(abortOutcome(), 1, { retries: 2 })).toBe(false)
  })

  it('returns false for an unrecognized thrown value', () => {
    expect(shouldRetry(createFetchOutcome({ error: 'weird' }), 1, { retries: 2 })).toBe(false)
  })

  it('honors a custom shouldRetry decision for status errors even without retryOnStatuses', () => {
    const config: RetryConfig = { retries: 3, shouldRetry: () => true }

    expect(shouldRetry(statusOutcome(500), 1, config)).toBe(true)
  })

  it('uses zero retries when retries is undefined', () => {
    expect(shouldRetry(networkOutcome(), 1, {})).toBe(false)
  })

  it('allows retry on first attempt when retries is configured', () => {
    expect(shouldRetry(networkOutcome(), 1, { retries: 1 })).toBe(true)
  })

  it('calls custom shouldRetry with correct arguments', () => {
    const outcome = statusOutcome(500)
    const custom = vi.fn().mockReturnValue(true)

    expect(shouldRetry(outcome, 2, { retries: 3, shouldRetry: custom })).toBe(true)
    expect(custom).toHaveBeenCalledWith(outcome, 2)
  })

  it('does not retry when attempt equals retries+1', () => {
    expect(shouldRetry(networkOutcome(), 3, { retries: 2 })).toBe(false)
  })
})
