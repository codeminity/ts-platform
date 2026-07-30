import type { AuthConfig } from './auth-config.interface'
import type { RefreshQueue } from './refresh-queue.interface'

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
  const { isTokenExpired, refreshToken, onRefreshStart, onRefreshSuccess, onRefreshFail } = config

  if (!isTokenExpired || !refreshToken) return

  await refreshQueue.run(async () => {
    const expired = await isTokenExpired()

    if (!expired) return

    try {
      await onRefreshStart?.()
      await refreshToken()
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
