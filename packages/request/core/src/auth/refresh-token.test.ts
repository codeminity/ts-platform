import { describe, it, expect, vi } from 'vitest'

import { createAuthConfig } from './mocks/create-auth-config.js'
import { createRefreshQueue } from './mocks/create-refresh-queue.js'
import { handleRefreshToken } from './refresh-token.js'

import type { AuthConfig } from './auth-config.interface.js'

type IsTokenExpired = NonNullable<AuthConfig['isTokenExpired']>
type RefreshToken = NonNullable<AuthConfig['refreshToken']>
type OnRefreshStart = NonNullable<AuthConfig['onRefreshStart']>
type OnRefreshSuccess = NonNullable<AuthConfig['onRefreshSuccess']>
type OnRefreshFail = NonNullable<AuthConfig['onRefreshFail']>

describe(handleRefreshToken, () => {
  it('does NOT call refreshToken when token is NOT expired', async () => {
    const isTokenExpired = vi.fn<IsTokenExpired>().mockResolvedValue(false)
    const refreshToken = vi.fn<RefreshToken>()

    const onStart = vi.fn<OnRefreshStart>()
    const onSuccess = vi.fn<OnRefreshSuccess>()

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

  it('returns early when only isTokenExpired is missing', async () => {
    const refreshToken = vi.fn<RefreshToken>()

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
      isTokenExpired: vi.fn<IsTokenExpired>().mockResolvedValue(true),
      refreshToken: vi.fn<RefreshToken>(),
      onRefreshStart: undefined,
      onRefreshSuccess: undefined
    })

    const queue = createRefreshQueue()

    await expect(handleRefreshToken(config, queue)).resolves.toBeUndefined()
  })

  it('times out and calls onRefreshFail when refreshToken never settles', async () => {
    const refreshToken = vi.fn<RefreshToken>().mockReturnValue(
      new Promise<void>(() => {
        /* never settles */
      })
    )
    const onFail = vi.fn<OnRefreshFail>()

    const config = createAuthConfig({
      isTokenExpired: vi.fn<IsTokenExpired>().mockResolvedValue(true),
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

  it('clears the timeout timer once refreshToken settles', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    const config = createAuthConfig({
      isTokenExpired: vi.fn<IsTokenExpired>().mockResolvedValue(true),
      refreshToken: vi.fn<RefreshToken>().mockResolvedValue(undefined),
      refreshTimeout: 20
    })

    const queue = createRefreshQueue()

    await handleRefreshToken(config, queue)

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)

    clearTimeoutSpy.mockRestore()
  })

  it('does not apply a timeout when refreshTimeout is not configured', async () => {
    const onSuccess = vi.fn<OnRefreshSuccess>()

    const config = createAuthConfig({
      isTokenExpired: vi.fn<IsTokenExpired>().mockResolvedValue(true),
      refreshToken: vi.fn<RefreshToken>(
        () => new Promise<void>((resolve) => setTimeout(resolve, 10))
      ),
      onRefreshSuccess: onSuccess
    })

    const queue = createRefreshQueue()

    await handleRefreshToken(config, queue)

    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('surfaces the final error when a retried attempt also fails and is not retried again', async () => {
    const refreshToken = vi
      .fn<RefreshToken>()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockRejectedValueOnce(new Error('second failure'))

    const onFail = vi
      .fn<NonNullable<AuthConfig['onRefreshFail']>>()
      .mockImplementationOnce(async (_error, retry) => {
        await retry()
      })
      .mockImplementationOnce(() => {
        /* does not retry the second time */
      })

    const config = createAuthConfig({
      isTokenExpired: vi.fn<IsTokenExpired>().mockResolvedValue(true),
      refreshToken,
      onRefreshFail: onFail
    })

    const queue = createRefreshQueue()

    await expect(handleRefreshToken(config, queue)).rejects.toThrow('second failure')

    expect(refreshToken).toHaveBeenCalledTimes(2)
    expect(onFail).toHaveBeenCalledTimes(2)
  })

  it('fails safe when onRefreshFail throws without ever calling retry', async () => {
    const refreshToken = vi.fn<RefreshToken>().mockRejectedValue(new Error('original failure'))

    const config = createAuthConfig({
      isTokenExpired: vi.fn<IsTokenExpired>().mockResolvedValue(true),
      refreshToken,
      onRefreshFail: () => {
        throw new Error('broken onRefreshFail')
      }
    })

    const queue = createRefreshQueue()

    await expect(handleRefreshToken(config, queue)).rejects.toThrow('original failure')
    expect(refreshToken).toHaveBeenCalledTimes(1)
  })

  it('resolves without waiting for an un-awaited retry, and still runs it in the background', async () => {
    let resolveSecondAttempt!: () => void

    const refreshToken = vi
      .fn<RefreshToken>()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveSecondAttempt = resolve
          })
      )

    const config = createAuthConfig({
      isTokenExpired: vi.fn<IsTokenExpired>().mockResolvedValue(true),
      refreshToken,
      onRefreshFail: (_error, retry) => {
        // Deliberate misuse: fire-and-forget, never awaited or returned —
        // the internal safety-net `.catch()` (see refresh-token.ts) is what
        // stops this from ever surfacing as an unhandled rejection if the
        // background attempt later fails; that part is plain, well-understood
        // promise semantics and isn't re-verified with its own test here.
        void retry()
      }
    })

    const queue = createRefreshQueue()

    // Resolves once `onRefreshFail` returns — it never awaited `retry()`,
    // so this doesn't wait for the second `refreshToken()` call to settle.
    await expect(handleRefreshToken(config, queue)).resolves.toBeUndefined()

    expect(refreshToken).toHaveBeenCalledTimes(2)

    // The background retry is still real, not abandoned — letting it
    // resolve now doesn't throw or hang.
    resolveSecondAttempt()
    await Promise.resolve()
  })
})
