import { delay } from '@codeminity/request-core'

import { shouldRetry } from './should-retry.js'

import type { RetryConfig } from './retry-config.interface.js'
import type { AxiosError, GenericAbortSignal } from 'axios'

export async function handleRetry(
  error: AxiosError,
  attempt: number,
  config: RetryConfig,
  signal?: GenericAbortSignal
): Promise<boolean> {
  // A broken `shouldRetry` shouldn't replace the original failure or
  // suppress its onEvent/onError telemetry — swallow it and let `canRetry`
  // stay `false`, the same fail-safe outcome as if it had returned false
  // normally; the caller still sees `error`, not this callback's own.
  let canRetry = false

  try {
    canRetry = shouldRetry(error, attempt, config)
  } catch {
    /* empty */
  }

  if (!canRetry) {
    return false
  }

  let retryDelay: number

  try {
    // Stryker disable next-line OptionalChaining: equivalent mutant —
    // without `?.`, a missing `getRetryDelay` throws instead of returning
    // `undefined`, which the catch below turns into the exact same
    // `config.retryDelay ?? 0` fallback the `??` chain would have computed
    // anyway.
    retryDelay = config.getRetryDelay?.(attempt, error) ?? config.retryDelay ?? 0
  } catch {
    retryDelay = config.retryDelay ?? 0
  }

  if (retryDelay > 0) {
    await delay(retryDelay, signal)
  }

  return true
}
