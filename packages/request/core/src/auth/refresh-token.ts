import type { AuthConfig } from './auth-config.interface.js'
import type { RefreshQueue } from './refresh-queue.interface.js'

/**
 * Runs `task`, racing it against a timer — rejects with a timeout error if
 * `task` hasn't settled within `timeoutMs`. The timer is always cleared, so
 * a `task` that settles first never leaves a dangling timer behind.
 */
async function callWithTimeout(task: () => void | Promise<void>, timeoutMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`refreshToken did not settle within ${String(timeoutMs)}ms`))
    }, timeoutMs)
  })

  // `Promise.race` below attaches its own rejection handler, but only once
  // its executor runs — giving `timedOut` an immediate no-op `.catch` closes
  // the brief window where Node could otherwise flag it as unhandled before
  // `Promise.race` subscribes.
  timedOut.catch(() => {
    /* handled via Promise.race below */
  })

  try {
    await Promise.race([task(), timedOut])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Runs the configured refresh flow if the current token is expired, coordinating
 * concurrent callers through the given refresh queue so only one refresh executes
 * at a time.
 *
 * @public
 */
export async function handleRefreshToken(
  config: AuthConfig,
  refreshQueue: RefreshQueue
): Promise<void> {
  const {
    isTokenExpired,
    refreshToken,
    refreshTimeout,
    onRefreshStart,
    onRefreshSuccess,
    onRefreshFail
  } = config

  if (!isTokenExpired || !refreshToken) return

  await refreshQueue.run(async () => {
    const expired = await isTokenExpired()

    if (!expired) return

    try {
      await onRefreshStart?.()

      if (refreshTimeout != null) {
        await callWithTimeout(refreshToken, refreshTimeout)
      } else {
        await refreshToken()
      }

      await onRefreshSuccess?.()
    } catch (error) {
      try {
        // Stryker disable next-line OptionalChaining: equivalent mutant — the
        // surrounding catch already swallows a missing-callback TypeError
        // identically to how it swallows any other callback failure, so no
        // observable behavior can distinguish `?.()` from a bare call here.
        await onRefreshFail?.(error)
      } catch {
        // ignore callback failure
      }

      throw error
    }
  })
}
