import { delay } from '@codeminity/request-core'

import { shouldRetry } from './should-retry.js'

import type { RetryConfig } from './retry-config.interface.js'
import type { FetchOutcome } from '../errors/fetch-outcome.interface.js'

export async function handleRetry(
  outcome: FetchOutcome,
  attempt: number,
  config: RetryConfig
): Promise<boolean> {
  const canRetry = shouldRetry(outcome, attempt, config)

  if (!canRetry) {
    return false
  }

  const retryDelay = config.getRetryDelay?.(attempt, outcome) ?? config.retryDelay ?? 0

  if (retryDelay > 0) {
    await delay(retryDelay)
  }

  return true
}
