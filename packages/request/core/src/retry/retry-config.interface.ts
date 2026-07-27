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
}
