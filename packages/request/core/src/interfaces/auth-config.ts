import type { TokenMode } from '../types/token-mode'

export interface AuthConfig {
  tokenMode?: TokenMode
  getToken?: () => string | null | Promise<string | null>
  isTokenExpired?: () => boolean | Promise<boolean>
  refreshToken?: () => void | Promise<void>

  onRefreshStart?: () => void | Promise<void>
  onRefreshSuccess?: () => void | Promise<void>
  onRefreshFail?: (error: unknown) => void | Promise<void>
}
