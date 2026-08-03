import type { RetryConfig } from '../retry/retry-config.interface.js'
import type { InternalAxiosRequestConfig } from 'axios'

/**
 * Per-request `codeminity` override, passed via a single request's Axios config.
 *
 * @public
 */
export interface RequestConfig extends Pick<RetryConfig, 'retries' | 'retryDelay'> {
  /** Skips authentication handling for this request, regardless of `tokenMode`. */
  skipAuth?: boolean
}

export interface InternalRequestConfig extends InternalAxiosRequestConfig {
  codeminity?: RequestConfig
  attempt?: number
}
