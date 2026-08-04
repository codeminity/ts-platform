import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchOutcome } from '../mocks/create-fetch-outcome.js'

import type { FetchOutcome } from '../errors/fetch-outcome.interface.js'

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
    expect(delay).toHaveBeenCalledWith(500)
  })

  it('prefers getRetryDelay over retryDelay', async () => {
    shouldRetry.mockReturnValue(true)

    const getRetryDelay = vi.fn().mockReturnValue(1000)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 3, { retryDelay: 500, getRetryDelay })

    expect(result).toBe(true)
    expect(getRetryDelay).toHaveBeenCalledWith(3, outcome)
    expect(delay).toHaveBeenCalledWith(1000)
  })

  it('uses retryDelay when getRetryDelay returns undefined', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const getRetryDelay = vi.fn().mockReturnValue(undefined)

    const result = await handleRetry(outcome, 2, { retryDelay: 300, getRetryDelay })

    expect(result).toBe(true)
    expect(getRetryDelay).toHaveBeenCalledWith(2, outcome)
    expect(delay).toHaveBeenCalledWith(300)
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
    expect(delay).toHaveBeenCalledWith(200)
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
    expect(delay).toHaveBeenCalledWith(250)
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
})
