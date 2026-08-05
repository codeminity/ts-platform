import type { RetryConfig } from './retry-config.interface.js'
import type { FetchOutcome } from '../errors/fetch-outcome.interface.js'

export function shouldRetry(outcome: FetchOutcome, attempt: number, config: RetryConfig): boolean {
  const configuredRetries = config.retries ?? 0
  // `attempt > NaN` is always false, so a NaN retries value (reachable with
  // no type-bypass, e.g. a division by zero) would otherwise silently
  // disable the retry cap forever instead of the safe "don't retry" default.
  const retries = Number.isNaN(configuredRetries) ? 0 : configuredRetries

  if (attempt > retries) {
    return false
  }

  if (config.shouldRetry) {
    return config.shouldRetry(outcome, attempt)
  }

  if (outcome.response) {
    return config.retryOnStatuses?.includes(outcome.response.status) ?? false
  }

  const error = outcome.error

  if (error instanceof DOMException) {
    return error.name === 'TimeoutError'
  }

  return error instanceof TypeError
}
