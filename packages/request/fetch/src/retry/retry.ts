import { delay, resolveRetryDelay } from '@codeminity/request-core'

import { parseRetryAfter } from './parse-retry-after.js'
import { shouldRetry } from './should-retry.js'

import type { RetryConfig } from './retry-config.interface.js'
import type { FetchOutcome } from '../errors/fetch-outcome.interface.js'

export async function handleRetry(
  outcome: FetchOutcome,
  attempt: number,
  config: RetryConfig,
  signal?: AbortSignal | null
): Promise<boolean> {
  // A broken `shouldRetry` shouldn't replace the original failure or
  // suppress its onEvent/onError telemetry — swallow it and let `canRetry`
  // stay `false`, the same fail-safe outcome as if it had returned false
  // normally; the caller still sees `outcome`, not this callback's own.
  let canRetry = false

  try {
    canRetry = shouldRetry(outcome, attempt, config)
  } catch {
    /* empty */
  }

  if (!canRetry) {
    return false
  }

  // A caller's own `getRetryDelay` is a full override of the default
  // backoff (matching `shouldRetry`'s own full-override contract) — it
  // always wins over `Retry-After`, which only ever boosts the *default*
  // `retryDelay` fallback below.
  const retryAfterMs = parseRetryAfter(outcome.response?.headers.get('retry-after'))
  const defaultDelay = resolveRetryDelay(config.retryDelay ?? 0, retryAfterMs)

  let retryDelay: number

  try {
    // Stryker disable next-line OptionalChaining: equivalent mutant —
    // without `?.`, a missing `getRetryDelay` throws instead of returning
    // `undefined`, which the catch below turns into the exact same
    // `defaultDelay` fallback the `??` chain would have computed anyway.
    retryDelay = config.getRetryDelay?.(attempt, outcome) ?? defaultDelay
  } catch {
    retryDelay = defaultDelay
  }

  if (retryDelay > 0) {
    await delay(retryDelay, signal ?? undefined)
  }

  return true
}
