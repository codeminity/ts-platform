import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  delay as Delay,
  resolveRetryDelay as ResolveRetryDelay,
  applyRetryJitter as ApplyRetryJitter
} from '@codeminity/request-core'

import { createFetchOutcome } from '../shared/mocks/create-fetch-outcome.js'

import type { parseRetryAfter as ParseRetryAfter } from './parse-retry-after.js'
import type { RetryConfig } from './retry-config.interface.js'
import type { shouldRetry as ShouldRetry } from './should-retry.js'
import type { FetchOutcome } from '../errors/fetch-outcome.interface.js'

type GetRetryDelay = NonNullable<RetryConfig['getRetryDelay']>

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

  it('returns false without delaying when shouldRetry throws', async () => {
    shouldRetry.mockImplementation(() => {
      throw new Error('broken shouldRetry')
    })

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, { retries: 3 })

    expect(result).toBe(false)
    expect(delay).not.toHaveBeenCalled()
  })

  it('falls back to no delay when getRetryDelay throws and retryDelay is not configured', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const getRetryDelay = vi.fn<GetRetryDelay>().mockImplementation(() => {
      throw new Error('broken getRetryDelay')
    })

    const result = await handleRetry(outcome, 1, { getRetryDelay })

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('passes undefined to delay when no signal is provided', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, { retryDelay: 500 }, null)

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

  it('still honors the Retry-After value when getRetryDelay throws', async () => {
    shouldRetry.mockReturnValue(true)
    parseRetryAfter.mockReturnValue(900)

    const getRetryDelay = vi.fn<GetRetryDelay>().mockImplementation(() => {
      throw new Error('broken getRetryDelay')
    })

    const { handleRetry } = await import('./retry.js')

    const result = await handleRetry(outcome, 1, { retryDelay: 200, getRetryDelay })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(900, undefined)
  })
})
