import type { TokenMode } from './token-mode.type.js'

/**
 * Configuration for the auth/token lifecycle: how tokens are read, checked for
 * expiry, and refreshed, plus lifecycle callbacks for the refresh flow.
 *
 * @public
 */
export interface AuthConfig {
  /** Selects how authentication is applied to a request. */
  tokenMode?: TokenMode
  /** Returns the current access token, or a falsy value if none is available. */
  getToken?: () => string | null | Promise<string | null>
  /** Reports whether the current token is expired and a refresh should run. */
  isTokenExpired?: () => boolean | Promise<boolean>
  /** Performs the token refresh; called once per coordinated refresh cycle. */
  refreshToken?: () => void | Promise<void>
  /**
   * Milliseconds to wait for `refreshToken` before treating it as failed.
   * Unset by default — a `refreshToken` that never settles never fails on
   * its own unless this is set; see DECISIONS.md#adr-008-optional-refreshtoken-timeout.
   * Can't rescue a `refreshToken` that blocks the event loop synchronously —
   * only one that returns a promise that never settles.
   */
  refreshTimeout?: number

  /** Called before a refresh cycle begins. */
  onRefreshStart?: () => void | Promise<void>
  /** Called after a refresh cycle completes successfully. */
  onRefreshSuccess?: () => void | Promise<void>
  /** Called when a refresh cycle throws; receives the thrown error. */
  onRefreshFail?: (error: unknown) => void | Promise<void>
}
