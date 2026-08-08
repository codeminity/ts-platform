/**
 * Retry behavior for a request: how many attempts to make and how long to wait between them.
 *
 * @public
 */
export interface RetryConfig {
  /** Maximum number of retry attempts. */
  retries?: number
  /** Delay in milliseconds between retry attempts. */
  retryDelay?: number
  /**
   * Randomizes the default retry delay to avoid many clients retrying in
   * lockstep after the same failure ("thundering herd"). `'full'` picks
   * anywhere from 0 up to the computed delay; `'equal'` keeps at least half
   * of it. Unset (`'none'`) by default — no randomization unless configured.
   * Has no effect when `getRetryDelay` is set, since that's a full override
   * of the default delay computation.
   */
  retryJitter?: 'none' | 'full' | 'equal'
}
