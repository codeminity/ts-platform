import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AxiosError } from 'axios'

const delay = vi.fn()
const shouldRetry = vi.fn()

vi.mock('@codeminity/request-core', () => ({
  delay
}))

vi.mock('../../../src/utils/should-retry', () => ({
  shouldRetry
}))

describe('handleRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false when retry is not allowed', async () => {
    shouldRetry.mockReturnValue(false)

    const { handleRetry } = await import('../../../src/handlers/retry')

    const result = await handleRetry({} as AxiosError, 1, {})

    expect(result).toBe(false)
    expect(delay).not.toHaveBeenCalled()
  })

  it('returns true without delay when retryDelay is 0', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('../../../src/handlers/retry')

    const result = await handleRetry({} as AxiosError, 1, {
      retryDelay: 0
    })

    expect(result).toBe(true)
    expect(delay).not.toHaveBeenCalled()
  })

  it('waits using retryDelay when configured', async () => {
    shouldRetry.mockReturnValue(true)

    const { handleRetry } = await import('../../../src/handlers/retry')

    const result = await handleRetry({} as AxiosError, 2, {
      retryDelay: 500
    })

    expect(result).toBe(true)
    expect(delay).toHaveBeenCalledWith(500)
  })

  it('prefers getRetryDelay over retryDelay', async () => {
    shouldRetry.mockReturnValue(true)

    const getRetryDelay = vi.fn().mockReturnValue(1000)

    const { handleRetry } = await import('../../../src/handlers/retry')

    const error = {} as AxiosError

    const result = await handleRetry(error, 3, {
      retryDelay: 500,
      getRetryDelay
    })

    expect(result).toBe(true)
    expect(getRetryDelay).toHaveBeenCalledWith(3, error)
    expect(delay).toHaveBeenCalledWith(1000)
  })
})
