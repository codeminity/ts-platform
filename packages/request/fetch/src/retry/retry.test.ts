import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchOutcome } from '../shared/mocks/create-fetch-outcome.js'

import type { FetchOutcome } from '../errors/fetch-outcome.interface.js'

const delay = vi.fn()
const shouldRetry = vi.fn()
const parseRetryAfter = vi.fn()
const resolveRetryDelay = vi.fn()
const applyRetryJitter = vi.fn()

vi.mock(import('@codeminity/request-core'), () => ({
  delay,
  resolveRetryDelay,
  applyRetryJitter
}))

vi.mock(import('./should-retry.js'), () => ({
  shouldRetry
}))

vi.mock(import('./parse-retry-after.js'), () => ({
  parseRetryAfter
}))

const outcome: FetchOutcome = createFetchOutcome({ error: new TypeError('fetch failed') })

describe('handleRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    parseRetryAfter.mockReturnValue(undefined)
    applyRetryJitter.mockImplementation((delayMs: number) => delayMs)
    resolveRetryDelay.mockImplementation((configuredDelay: number, suggestedDelayMs?: number) =>
      Math.max(configuredDelay, suggestedDelayMs ?? 0)
    )
  })

  it('returns false when retry is not allowed', async () => {
    shouldRetry.mockReturnValue(false)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, {})

    expect(result).toBe(false)
    expect(delay).not.toHaveBeenCalled()
  })

  it('returns true without delay when retryDelay is 0', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, { retryDelay: 0 })

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('waits using retryDelay when configured', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 2, { retryDelay: 500 })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(500, undefined)
  })

  it('prefers getRetryDelay over retryDelay', async () => {
    shouldRetry.mockReturnValue(true)

    const getRetryDelay = vi.fn().mockReturnValue(1000)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 3, { retryDelay: 500, getRetryDelay })

    expect(result).toBe(true)
    expect(getRetryDelay).toHaveBeenCalledWith(3, outcome)
    expect(delay).toHaveBeenCalledWith(1000, undefined)
  })

  it('uses retryDelay when getRetryDelay returns undefined', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const getRetryDelay = vi.fn().mockReturnValue(undefined)

    const result = await handleRetry(outcome, 2, { retryDelay: 300, getRetryDelay })

    expect(result).toBe(true)
    expect(getRetryDelay).toHaveBeenCalledWith(2, outcome)
    expect(delay).toHaveBeenCalledWith(300, undefined)
  })

  it('returns true without delay when no retry delay is configured', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, {})

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('does not delay when retryDelay is negative', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, { retryDelay: -100 })

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('falls back when getRetryDelay returns null', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const getRetryDelay = vi.fn().mockReturnValue(null)

    const result = await handleRetry(outcome, 1, { retryDelay: 200, getRetryDelay })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(200, undefined)
  })

  it('returns false without delaying when shouldRetry throws', async () => {
    shouldRetry.mockImplementation(() => {
      throw new Error('broken shouldRetry')
    })

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, { retries: 3 })

    expect(result).toBe(false)
    expect(delay).not.toHaveBeenCalled()
  })

  it('falls back to retryDelay when getRetryDelay throws', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const getRetryDelay = vi.fn().mockImplementation(() => {
      throw new Error('broken getRetryDelay')
    })

    const result = await handleRetry(outcome, 1, { retryDelay: 250, getRetryDelay })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(250, undefined)
  })

  it('falls back to no delay when getRetryDelay throws and retryDelay is not configured', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const getRetryDelay = vi.fn().mockImplementation(() => {
      throw new Error('broken getRetryDelay')
    })

    const result = await handleRetry(outcome, 1, { getRetryDelay })

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('passes the abort signal through to delay so a mid-backoff abort is observed immediately', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const controller = new AbortController()

    const result = await handleRetry(outcome, 1, { retryDelay: 500 }, controller.signal)

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(500, controller.signal)
  })

  it('passes undefined to delay when no signal is provided', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, { retryDelay: 500 }, null)

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(500, undefined)
  })

  it('boosts the delay to the Retry-After value when it is larger than retryDelay', async () => {
    shouldRetry.mockReturnValue(true)
    parseRetryAfter.mockReturnValue(800)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, { retryDelay: 500 })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(800, undefined)
  })

  it('keeps retryDelay when it is larger than the Retry-After value', async () => {
    shouldRetry.mockReturnValue(true)
    parseRetryAfter.mockReturnValue(100)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, { retryDelay: 500 })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(500, undefined)
  })

  it('reads Retry-After from the response headers', async () => {
    shouldRetry.mockReturnValue(true)
    parseRetryAfter.mockReturnValue(0)

    const { handleRetry } = await import('./retry.js')

    const response = new Response(null, { headers: { 'retry-after': '30' } })
    const outcomeWithResponse = createFetchOutcome({ response })

    await handleRetry(outcomeWithResponse, 1, {})

    expect(parseRetryAfter).toHaveBeenCalledWith('30')
  })

  it('does not throw when there is no response at all', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, { retryDelay: 100 })

    expect(result).toBe(true)
    expect(parseRetryAfter).toHaveBeenCalledWith(undefined)
  })

  it('lets a configured getRetryDelay override win over the Retry-After value', async () => {
    shouldRetry.mockReturnValue(true)
    parseRetryAfter.mockReturnValue(5000)

    const getRetryDelay = vi.fn().mockReturnValue(1000)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, { retryDelay: 500, getRetryDelay })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(1000, undefined)
  })

  it('still honors the Retry-After value when getRetryDelay throws', async () => {
    shouldRetry.mockReturnValue(true)
    parseRetryAfter.mockReturnValue(900)

    const getRetryDelay = vi.fn().mockImplementation(() => {
      throw new Error('broken getRetryDelay')
    })

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, { retryDelay: 200, getRetryDelay })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(900, undefined)
  })

  it('applies jitter to the configured retryDelay', async () => {
    shouldRetry.mockReturnValue(true)
    applyRetryJitter.mockReturnValue(250)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, { retryDelay: 500, retryJitter: 'full' })

    expect(result).toBe(true)
    expect(applyRetryJitter).toHaveBeenCalledWith(500, 'full')
    expect(delay).toHaveBeenCalledWith(250, undefined)
  })

  it('does not apply jitter to a getRetryDelay override', async () => {
    shouldRetry.mockReturnValue(true)
    applyRetryJitter.mockReturnValue(250)

    const getRetryDelay = vi.fn().mockReturnValue(1000)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, {
      retryDelay: 500,
      retryJitter: 'full',
      getRetryDelay
    })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(1000, undefined)
  })
})
