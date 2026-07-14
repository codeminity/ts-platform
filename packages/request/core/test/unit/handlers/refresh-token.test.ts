import { describe, it, expect, vi } from 'vitest'

import { handleRefreshToken } from '../../../src'
import { createAuthConfig } from '../../mocks/create-auth-config'
import { createRefreshQueue } from '../../mocks/create-refresh-queue'

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

  it('does not share refresh state', () => {
    const queueA = createRefreshQueue()
    const queueB = createRefreshQueue()

    expect(queueA).not.toBe(queueB)
  })
})
