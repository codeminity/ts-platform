import type { RetryConfig as CoreRetryConfig } from '@codeminity/request-core'

import type { FetchOutcome } from '../errors/fetch-outcome.interface'

/**
 * Retry behavior for requests made through a `createFetch` instance.
 *
 * @public
 */
export interface RetryConfig extends CoreRetryConfig {
  /** Computes the delay before a given retry attempt. Overrides the default backoff. */
  getRetryDelay?: (attempt: number, outcome: FetchOutcome) => number
  /** HTTP status codes that should trigger a retry. Ignored when `shouldRetry` is set. */
  retryOnStatuses?: number[]
  /** Full override deciding whether to retry; when set, it is the sole decision-maker for the request. */
  shouldRetry?: (outcome: FetchOutcome, attempt: number) => boolean
}
