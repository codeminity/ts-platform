import { describe, it, expect, vi } from 'vitest'

import { createAuthConfig } from './mocks/create-auth-config.js'
import { createRefreshQueue } from './mocks/create-refresh-queue.js'
import { handleRefreshToken } from './refresh-token.js'

describe('handleRefreshToken', () => {
  it('calls refreshToken when token is expired and triggers success flow', async () => {
    const isTokenExpired = vi.fn().mockResolvedValue(true)
    const refreshToken = vi.fn()

    const onStart = vi.fn()
    const onSuccess = vi.fn()

    const config = createAuthConfig({
      isTokenExpired,
      refreshToken,
      onRefreshStart: onStart,
      onRefreshSuccess: onSuccess
    })

    const queue = createRefreshQueue()

    await handleRefreshToken(config, queue)

    expect(queue.run).toHaveBeenCalledTimes(1)

    expect(isTokenExpired).toHaveBeenCalledTimes(1)
    expect(refreshToken).toHaveBeenCalledTimes(1)

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('does NOT call refreshToken when token is NOT expired', async () => {
    const isTokenExpired = vi.fn().mockResolvedValue(false)
    const refreshToken = vi.fn()

    const onStart = vi.fn()
    const onSuccess = vi.fn()

    const config = createAuthConfig({
      isTokenExpired,
      refreshToken,
      onRefreshStart: onStart,
      onRefreshSuccess: onSuccess
    })

    const queue = createRefreshQueue()

    await handleRefreshToken(config, queue)

    expect(queue.run).toHaveBeenCalledTimes(1)

    expect(isTokenExpired).toHaveBeenCalledTimes(1)
    expect(refreshToken).not.toHaveBeenCalled()

    expect(onStart).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('calls fail hook when refreshToken throws error', async () => {
    const isTokenExpired = vi.fn().mockResolvedValue(true)
    const refreshToken = vi.fn().mockRejectedValue(new Error('fail'))

    const onFail = vi.fn()

    const config = createAuthConfig({
      isTokenExpired,
      refreshToken,
      onRefreshFail: onFail
    })

    const queue = createRefreshQueue()

    await expect(handleRefreshToken(config, queue)).rejects.toThrow('fail')

    expect(onFail).toHaveBeenCalledTimes(1)
  })

  it('always executes inside refresh queue', async () => {
    const config = createAuthConfig({
      isTokenExpired: vi.fn().mockResolvedValue(true),
      refreshToken: vi.fn()
    })

    const queue = createRefreshQueue()

    await handleRefreshToken(config, queue)

    expect(queue.run).toHaveBeenCalledTimes(1)
  })

  it('safely exits when refresh dependencies are missing', async () => {
    const config = createAuthConfig({
      isTokenExpired: undefined,
      refreshToken: undefined
    })

    const queue = createRefreshQueue()

    await handleRefreshToken(config, queue)

    expect(queue.run).not.toHaveBeenCalled()
  })

  it('runs refresh only once', async () => {
    const queue = createRefreshQueue()

    const isTokenExpired = vi.fn().mockResolvedValue(true)
    const refreshToken = vi.fn().mockResolvedValue(undefined)
    const onStart = vi.fn()
    const onSuccess = vi.fn()

    const config = createAuthConfig({
      isTokenExpired,
      refreshToken,
      onRefreshStart: onStart,
      onRefreshSuccess: onSuccess
    })

    await Promise.all([
      handleRefreshToken(config, queue),
      handleRefreshToken(config, queue),
      handleRefreshToken(config, queue)
    ])

    expect(refreshToken).toHaveBeenCalledTimes(1)
  })

  it('returns early when only refreshToken is missing', async () => {
    const isTokenExpired = vi.fn().mockResolvedValue(true)

    const config = createAuthConfig({
      isTokenExpired,
      refreshToken: undefined
    })

    const queue = createRefreshQueue()

    await handleRefreshToken(config, queue)

    expect(queue.run).not.toHaveBeenCalled()
  })

  it('returns early when only isTokenExpired is missing', async () => {
    const refreshToken = vi.fn()

    const config = createAuthConfig({
      isTokenExpired: undefined,
      refreshToken
    })

    const queue = createRefreshQueue()

    await handleRefreshToken(config, queue)

    expect(queue.run).not.toHaveBeenCalled()
    expect(refreshToken).not.toHaveBeenCalled()
  })

  it('does not throw when onRefreshStart and onRefreshSuccess are not provided', async () => {
    const config = createAuthConfig({
      isTokenExpired: vi.fn().mockResolvedValue(true),
      refreshToken: vi.fn(),
      onRefreshStart: undefined,
      onRefreshSuccess: undefined
    })

    const queue = createRefreshQueue()

    await expect(handleRefreshToken(config, queue)).resolves.toBeUndefined()
  })

  it('does not throw an additional error when onRefreshFail is not provided', async () => {
    const config = createAuthConfig({
      isTokenExpired: vi.fn().mockResolvedValue(true),
      refreshToken: vi.fn().mockRejectedValue(new Error('fail')),
      onRefreshFail: undefined
    })

    const queue = createRefreshQueue()

    await expect(handleRefreshToken(config, queue)).rejects.toThrow('fail')
  })

  it('does not share refresh state', () => {
    const queueA = createRefreshQueue()
    const queueB = createRefreshQueue()

    expect(queueA).not.toBe(queueB)
  })

  it('times out and calls onRefreshFail when refreshToken never settles', async () => {
    const refreshToken = vi.fn().mockReturnValue(
      new Promise<void>(() => {
        /* never settles */
      })
    )
    const onFail = vi.fn()

    const config = createAuthConfig({
      isTokenExpired: vi.fn().mockResolvedValue(true),
      refreshToken,
      refreshTimeout: 20,
      onRefreshFail: onFail
    })

    const queue = createRefreshQueue()

    await expect(handleRefreshToken(config, queue)).rejects.toThrow(
      'refreshToken did not settle within 20ms'
    )
    expect(onFail).toHaveBeenCalledTimes(1)
  })

  it('succeeds when refreshToken resolves before the timeout, and clears the timer', async () => {
    const onSuccess = vi.fn()
    const onFail = vi.fn()

    const config = createAuthConfig({
      isTokenExpired: vi.fn().mockResolvedValue(true),
      refreshToken: vi.fn().mockResolvedValue(undefined),
      refreshTimeout: 20,
      onRefreshSuccess: onSuccess,
      onRefreshFail: onFail
    })

    const queue = createRefreshQueue()

    await handleRefreshToken(config, queue)

    expect(onSuccess).toHaveBeenCalledTimes(1)

    // If the timer weren't cleared, this would eventually fire onFail too.
    await new Promise((resolve) => setTimeout(resolve, 40))

    expect(onFail).not.toHaveBeenCalled()
  })

  it('clears the timeout timer once refreshToken settles', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    const config = createAuthConfig({
      isTokenExpired: vi.fn().mockResolvedValue(true),
      refreshToken: vi.fn().mockResolvedValue(undefined),
      refreshTimeout: 20
    })

    const queue = createRefreshQueue()

    await handleRefreshToken(config, queue)

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)

    clearTimeoutSpy.mockRestore()
  })

  it('does not apply a timeout when refreshTimeout is not configured', async () => {
    const onSuccess = vi.fn()

    const config = createAuthConfig({
      isTokenExpired: vi.fn().mockResolvedValue(true),
      refreshToken: vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 10))),
      onRefreshSuccess: onSuccess
    })

    const queue = createRefreshQueue()

    await handleRefreshToken(config, queue)

    expect(onSuccess).toHaveBeenCalledTimes(1)
  })
})
