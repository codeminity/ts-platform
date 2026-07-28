import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchOutcome } from '../mocks/create-fetch-outcome'

import type { FetchOutcome } from '../errors/fetch-outcome.interface'

const delay = vi.fn()
const shouldRetry = vi.fn()

vi.mock('@codeminity/request-core', () => ({
  delay
}))

vi.mock('./should-retry.ts', () => ({
  shouldRetry
}))

const outcome: FetchOutcome = createFetchOutcome({ error: new TypeError('fetch failed') })

describe('handleRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false when retry is not allowed', async () => {
    shouldRetry.mockReturnValue(false)

    const { handleRetry } = await import('./retry')

    const result = await handleRetry(outcome, 1, {})

    expect(result).toBe(false)
    expect(delay).not.toHaveBeenCalled()
  })

  it('returns true without delay when retryDelay is 0', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry')

    const result = await handleRetry(outcome, 1, { retryDelay: 0 })

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('waits using retryDelay when configured', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry')

    const result = await handleRetry(outcome, 2, { retryDelay: 500 })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(500)
  })

  it('prefers getRetryDelay over retryDelay', async () => {
    shouldRetry.mockReturnValue(true)

    const getRetryDelay = vi.fn().mockReturnValue(1000)

    const { handleRetry } = await import('./retry')

    const result = await handleRetry(outcome, 3, { retryDelay: 500, getRetryDelay })

    expect(result).toBe(true)
    expect(getRetryDelay).toHaveBeenCalledWith(3, outcome)
    expect(delay).toHaveBeenCalledWith(1000)
  })

  it('uses retryDelay when getRetryDelay returns undefined', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry')

    const getRetryDelay = vi.fn().mockReturnValue(undefined)

    const result = await handleRetry(outcome, 2, { retryDelay: 300, getRetryDelay })

    expect(result).toBe(true)
    expect(getRetryDelay).toHaveBeenCalledWith(2, outcome)
    expect(delay).toHaveBeenCalledWith(300)
  })

  it('returns true without delay when no retry delay is configured', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry')

    const result = await handleRetry(outcome, 1, {})

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('does not delay when retryDelay is negative', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry')

    const result = await handleRetry(outcome, 1, { retryDelay: -100 })

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('falls back when getRetryDelay returns null', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry')

    const getRetryDelay = vi.fn().mockReturnValue(null)

    const result = await handleRetry(outcome, 1, { retryDelay: 200, getRetryDelay })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(200)
  })
})
