import type { RetryConfig } from '../retry/retry-config.interface'
import type { InternalAxiosRequestConfig } from 'axios'

/**
 * @public
 */
export interface RequestConfig extends Pick<RetryConfig, 'retries' | 'retryDelay'> {
  skipAuth?: boolean
}

export interface InternalRequestConfig extends InternalAxiosRequestConfig {
  codeminity?: RequestConfig
  attempt?: number
}
