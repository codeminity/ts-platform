import { applyRetryJitter, delay, resolveRetryDelay } from '@codeminity/request-core'

import { parseRetryAfter } from './parse-retry-after.js'
import { shouldRetry } from './should-retry.js'

import type { RetryConfig } from './retry-config.interface.js'
import type { AxiosError, GenericAbortSignal } from 'axios'

// Axios types `AxiosResponseHeaders` as an intersection with a raw
// index-signature type, so TS sees `headers.get` as possibly a plain
// `string` value rather than always a callable method — a real `AxiosError`
// always carries an `AxiosHeaders` instance here, but a test double or a
// non-Axios-shaped mock might not, so this stays a runtime check either way.
function getRetryAfterHeader(error: AxiosError): string | undefined {
  const headers: unknown = error.response?.headers
  const get = (headers as { get?: unknown } | undefined)?.get

  if (typeof get !== 'function') {
    return undefined
  }

  const value: unknown = get.call(headers, 'retry-after')

  return typeof value === 'string' ? value : undefined
}

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

  // A caller's own `getRetryDelay` is a full override of the default
  // backoff (matching `shouldRetry`'s own full-override contract) — it
  // always wins over `Retry-After`, which only ever boosts the *default*
  // `retryDelay` fallback below.
  // Jitter only ever reduces (or leaves unchanged) the *configured* delay —
  // it never makes the client wait less than a server-provided Retry-After,
  // since that's combined in afterward via `resolveRetryDelay`'s max().
  const jitteredRetryDelay = applyRetryJitter(config.retryDelay ?? 0, config.retryJitter)
  const retryAfterMs = parseRetryAfter(getRetryAfterHeader(error))
  const defaultDelay = resolveRetryDelay(jitteredRetryDelay, retryAfterMs)

  let retryDelay: number

  try {
    // Stryker disable next-line OptionalChaining: equivalent mutant —
    // without `?.`, a missing `getRetryDelay` throws instead of returning
    // `undefined`, which the catch below turns into the exact same
    // `defaultDelay` fallback the `??` chain would have computed anyway.
    retryDelay = config.getRetryDelay?.(attempt, error) ?? defaultDelay
  } catch {
    retryDelay = defaultDelay
  }

  if (retryDelay > 0) {
    await delay(retryDelay, signal)
  }

  return true
}
