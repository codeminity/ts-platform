import { delay } from '@codeminity/request-core'

import { shouldRetry } from './should-retry'

import type { RetryConfig } from './retry-config.interface'
import type { AxiosError } from 'axios'

export async function handleRetry(
  error: AxiosError,
  attempt: number,
  config: RetryConfig
): Promise<boolean> {
  const canRetry = shouldRetry(error, attempt, config)

  if (!canRetry) {
    return false
  }

  const retryDelay = config.getRetryDelay?.(attempt, error) ?? config.retryDelay ?? 0

  if (retryDelay > 0) {
    await delay(retryDelay)
  }

  return true
}
