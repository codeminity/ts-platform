import type { RetryConfig } from './retry-config.interface.js'
import type { AxiosError } from 'axios'

export function shouldRetry(error: AxiosError, attempt: number, config: RetryConfig): boolean {
  const configuredRetries = config.retries ?? 0
  // `attempt > NaN` is always false, so a NaN retries value (reachable with
  // no type-bypass, e.g. a division by zero) would otherwise silently
  // disable the retry cap forever instead of the safe "don't retry" default.
  const retries = Number.isNaN(configuredRetries) ? 0 : configuredRetries

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
