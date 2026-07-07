import type { AuthConfig } from '../interfaces/auth-config'
import type { RefreshQueue } from '../interfaces/refresh-queue'

export async function handleRefreshToken(
  config: AuthConfig,
  refreshQueue: RefreshQueue
): Promise<void> {
  await refreshQueue.run(async () => {
    const { isTokenExpired, refreshToken, onRefreshStart, onRefreshSuccess, onRefreshFail } = config

    if (!isTokenExpired || !refreshToken) return

    const expired = await isTokenExpired()

    if (!expired) return

    try {
      await onRefreshStart?.()
      await refreshToken()
      await onRefreshSuccess?.()
    } catch (error) {
      await onRefreshFail?.(error)
      throw error
    }
  })
}
