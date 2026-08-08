import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AxiosError } from 'axios'

const delay = vi.fn()
const shouldRetry = vi.fn()
const parseRetryAfter = vi.fn()
const resolveRetryDelay = vi.fn()

vi.mock('@codeminity/request-core', () => ({
  delay,
  resolveRetryDelay
}))

vi.mock('./should-retry.ts', () => ({
  shouldRetry
}))

vi.mock('./parse-retry-after.ts', () => ({
  parseRetryAfter
}))

describe('handleRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    parseRetryAfter.mockReturnValue(undefined)
    resolveRetryDelay.mockImplementation((configuredDelay: number, suggestedDelayMs?: number) =>
      Math.max(configuredDelay, suggestedDelayMs ?? 0)
    )
  })

  it('returns false when retry is not allowed', async () => {
    shouldRetry.mockReturnValue(false)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry({} as AxiosError, 1, {})

    expect(result).toBe(false)
    expect(delay).not.toHaveBeenCalled()
  })

  it('returns true without delay when retryDelay is 0', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry({} as AxiosError, 1, {
      retryDelay: 0
    })

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('waits using retryDelay when configured', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry({} as AxiosError, 2, {
      retryDelay: 500
    })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(500, undefined)
  })

  it('prefers getRetryDelay over retryDelay', async () => {
    shouldRetry.mockReturnValue(true)

    const getRetryDelay = vi.fn().mockReturnValue(1000)

    const { handleRetry } = await import('./retry.js')

    const error = {} as AxiosError

    const result = await handleRetry(error, 3, {
      retryDelay: 500,
      getRetryDelay
    })

    expect(result).toBe(true)
    expect(getRetryDelay).toHaveBeenCalledWith(3, error)
    expect(delay).toHaveBeenCalledWith(1000, undefined)
  })

  it('uses retryDelay when getRetryDelay returns undefined', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const getRetryDelay = vi.fn().mockReturnValue(undefined)

    const result = await handleRetry({} as AxiosError, 2, {
      retryDelay: 300,
      getRetryDelay
    })

    expect(result).toBe(true)
    expect(getRetryDelay).toHaveBeenCalledWith(2, expect.any(Object))
    expect(delay).toHaveBeenCalledWith(300, undefined)
  })

  it('returns true without delay when no retry delay is configured', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry({} as AxiosError, 1, {})

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('does not delay when retryDelay is negative', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry({} as AxiosError, 1, {
      retryDelay: -100
    })

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('falls back when getRetryDelay returns null', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const getRetryDelay = vi.fn().mockReturnValue(null)

    const result = await handleRetry({} as AxiosError, 1, {
      retryDelay: 200,
      getRetryDelay
    })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(200, undefined)
  })

  it('returns false without delaying when shouldRetry throws', async () => {
    shouldRetry.mockImplementation(() => {
      throw new Error('broken shouldRetry')
    })

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry({} as AxiosError, 1, { retries: 3 })

    expect(result).toBe(false)
    expect(delay).not.toHaveBeenCalled()
  })

  it('falls back to retryDelay when getRetryDelay throws', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const getRetryDelay = vi.fn().mockImplementation(() => {
      throw new Error('broken getRetryDelay')
    })

    const result = await handleRetry({} as AxiosError, 1, {
      retryDelay: 250,
      getRetryDelay
    })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(250, undefined)
  })

  it('falls back to no delay when getRetryDelay throws and retryDelay is not configured', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const getRetryDelay = vi.fn().mockImplementation(() => {
      throw new Error('broken getRetryDelay')
    })

    const result = await handleRetry({} as AxiosError, 1, { getRetryDelay })

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('passes the abort signal through to delay so a mid-backoff abort is observed immediately', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const controller = new AbortController()

    const result = await handleRetry({} as AxiosError, 1, { retryDelay: 500 }, controller.signal)

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(500, controller.signal)
  })

  it('boosts the delay to the Retry-After value when it is larger than retryDelay', async () => {
    shouldRetry.mockReturnValue(true)
    parseRetryAfter.mockReturnValue(800)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry({} as AxiosError, 1, { retryDelay: 500 })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(800, undefined)
  })

  it('keeps retryDelay when it is larger than the Retry-After value', async () => {
    shouldRetry.mockReturnValue(true)
    parseRetryAfter.mockReturnValue(100)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry({} as AxiosError, 1, { retryDelay: 500 })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(500, undefined)
  })

  it('reads Retry-After from the response headers', async () => {
    shouldRetry.mockReturnValue(true)
    parseRetryAfter.mockReturnValue(0)

    const { handleRetry } = await import('./retry.js')

    const get = vi.fn().mockReturnValue('30')
    const error = { response: { headers: { get } } } as unknown as AxiosError

    await handleRetry(error, 1, {})

    expect(get).toHaveBeenCalledWith('retry-after')
    expect(parseRetryAfter).toHaveBeenCalledWith('30')
  })

  it('treats a non-string header value as absent', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const get = vi.fn().mockReturnValue(null)
    const error = { response: { headers: { get } } } as unknown as AxiosError

    await handleRetry(error, 1, { retryDelay: 100 })

    expect(parseRetryAfter).toHaveBeenCalledWith(undefined)
  })

  it('does not throw when the response has no headers.get method', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const error = { response: { headers: {} } } as unknown as AxiosError

    const result = await handleRetry(error, 1, { retryDelay: 100 })

    expect(result).toBe(true)
    expect(parseRetryAfter).toHaveBeenCalledWith(undefined)
  })

  it('lets a configured getRetryDelay override win over the Retry-After value', async () => {
    shouldRetry.mockReturnValue(true)
    parseRetryAfter.mockReturnValue(5000)

    const getRetryDelay = vi.fn().mockReturnValue(1000)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry({} as AxiosError, 1, { retryDelay: 500, getRetryDelay })

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

    const result = await handleRetry({} as AxiosError, 1, { retryDelay: 200, getRetryDelay })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(900, undefined)
  })
})
