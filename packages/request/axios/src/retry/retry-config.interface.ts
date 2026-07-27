import type { RetryConfig as CoreRetryConfig } from '@codeminity/request-core'

import type { AxiosError } from 'axios'

/**
 * Retry behavior for requests made through an Axios instance.
 *
 * @public
 */
export interface RetryConfig extends CoreRetryConfig {
  /** Computes the delay before a given retry attempt. Overrides the default backoff. */
  getRetryDelay?: (attempt: number, error: AxiosError) => number
  /** HTTP status codes that should trigger a retry. Ignored when `shouldRetry` is set. */
  retryOnStatuses?: number[]
  /** Full override deciding whether to retry; when set, it is the sole decision-maker for the request. */
  shouldRetry?: (error: AxiosError, attempt: number) => boolean
}
