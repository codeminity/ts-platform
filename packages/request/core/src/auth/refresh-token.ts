import type { AuthConfig } from './auth-config.interface'
import type { RefreshQueue } from './refresh-queue.interface'

/**
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
        await onRefreshFail?.(error)
      } catch {
        // ignore callback failure
      }

      throw error
    }
  })
}
