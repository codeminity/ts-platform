import type { RetryConfig } from '../interfaces/retry-config'
import type { AxiosError } from 'axios'

export function shouldRetry(error: AxiosError, attempt: number, config: RetryConfig): boolean {
  const retries = config.retries ?? 0

  if (attempt > retries) {
    return false
  }

  const status = error.response?.status

  const baseDecision =
    status != null
      ? (config.retryOnStatuses?.includes(status) ?? false)
      : error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED'

  if (!config.shouldRetry) {
    return baseDecision
  }

  return config.shouldRetry(error, attempt) && baseDecision
}
