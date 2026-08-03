import type { RetryConfig } from './retry-config.interface.js'
import type { FetchOutcome } from '../errors/fetch-outcome.interface.js'

export function shouldRetry(outcome: FetchOutcome, attempt: number, config: RetryConfig): boolean {
  const retries = config.retries ?? 0

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
