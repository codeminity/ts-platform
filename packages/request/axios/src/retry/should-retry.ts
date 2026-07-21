import type { RetryConfig } from './retry-config.interface'
import type { AxiosError } from 'axios'

export function shouldRetry(error: AxiosError, attempt: number, config: RetryConfig): boolean {
  const retries = config.retries ?? 0

  if (attempt > retries) {
    return false
  }

  const status = error.response?.status

  if (config.shouldRetry) {
    return config.shouldRetry(error, attempt)
  }

  return status != null
    ? (config.retryOnStatuses?.includes(status) ?? false)
    : error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED'
}
