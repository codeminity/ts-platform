import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  delay as Delay,
  resolveRetryDelay as ResolveRetryDelay,
  applyRetryJitter as ApplyRetryJitter
} from '@codeminity/request-core'

import type { parseRetryAfter as ParseRetryAfter } from './parse-retry-after.js'
import type { RetryConfig } from './retry-config.interface.js'
import type { shouldRetry as ShouldRetry } from './should-retry.js'
import type { AxiosError } from 'axios'

type GetRetryDelay = NonNullable<RetryConfig['getRetryDelay']>
type HeadersGet = (name: string) => string | null

const delay = vi.fn<typeof Delay>()
const shouldRetry = vi.fn<typeof ShouldRetry>()
const parseRetryAfter = vi.fn<typeof ParseRetryAfter>()
const resolveRetryDelay = vi.fn<typeof ResolveRetryDelay>()
const applyRetryJitter = vi.fn<typeof ApplyRetryJitter>()

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

describe('handleRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    parseRetryAfter.mockReturnValue(undefined)
    applyRetryJitter.mockImplementation((delayMs: number) => delayMs)
    resolveRetryDelay.mockImplementation((configuredDelay: number, suggestedDelayMs?: number) =>
      Math.max(configuredDelay, suggestedDelayMs ?? 0)
    )
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

  it('falls back to no delay when getRetryDelay throws and retryDelay is not configured', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const getRetryDelay = vi.fn<GetRetryDelay>().mockImplementation(() => {
      throw new Error('broken getRetryDelay')
    })

    const result = await handleRetry({} as AxiosError, 1, { getRetryDelay })

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('reads Retry-After from the response headers', async () => {
    shouldRetry.mockReturnValue(true)
    parseRetryAfter.mockReturnValue(0)

    const { handleRetry } = await import('./retry.js')

    const get = vi.fn<HeadersGet>().mockReturnValue('30')
    const error = { response: { headers: { get } } } as unknown as AxiosError

    await handleRetry(error, 1, {})

    expect(get).toHaveBeenCalledWith('retry-after')
    expect(parseRetryAfter).toHaveBeenCalledWith('30')
  })

  it('treats a non-string header value as absent', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const get = vi.fn<HeadersGet>().mockReturnValue(null)
    const error = { response: { headers: { get } } } as unknown as AxiosError

    await handleRetry(error, 1, { retryDelay: 100 })

    expect(parseRetryAfter).toHaveBeenCalledWith(undefined)
  })

  it('still honors the Retry-After value when getRetryDelay throws', async () => {
    shouldRetry.mockReturnValue(true)
    parseRetryAfter.mockReturnValue(900)

    const getRetryDelay = vi.fn<GetRetryDelay>().mockImplementation(() => {
      throw new Error('broken getRetryDelay')
    })

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry({} as AxiosError, 1, { retryDelay: 200, getRetryDelay })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(900, undefined)
  })

  it('applies jitter to the configured retryDelay', async () => {
    shouldRetry.mockReturnValue(true)
    applyRetryJitter.mockReturnValue(250)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry({} as AxiosError, 1, { retryDelay: 500, retryJitter: 'full' })

    expect(result).toBe(true)
    expect(applyRetryJitter).toHaveBeenCalledWith(500, 'full')
    expect(delay).toHaveBeenCalledWith(250, undefined)
  })
})
