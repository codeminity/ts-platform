import { emitterCallback, type RefreshQueue } from '@codeminity/request-core'

import { handleAuthRequest } from '../auth/handle-auth-request.js'
import { classifyOutcome } from '../errors/outcome-to-event.js'
import { handleRetry } from '../retry/retry.js'

import type { Config } from './config.interface.js'
import type { FetchRequestInit } from './request-config.interface.js'
import type { FetchOutcome } from '../errors/fetch-outcome.interface.js'

async function runOnce(
  input: RequestInfo | URL,
  init: FetchRequestInit,
  config: Config,
  refreshQueue: RefreshQueue
): Promise<FetchOutcome> {
  try {
    const authedInit = await handleAuthRequest(input, init, config, refreshQueue)

    return { input, init, response: await fetch(input, authedInit) }
  } catch (error) {
    return { input, init, error }
  }
}

async function attempt(
  input: RequestInfo | URL,
  init: FetchRequestInit,
  config: Config,
  refreshQueue: RefreshQueue,
  attemptNumber: number
): Promise<Response> {
  const outcome = await runOnce(input, init, config, refreshQueue)

  if (outcome.response?.ok) {
    return outcome.response
  }

  const nextAttempt = attemptNumber + 1
  const retryConfig = { ...config, ...init.codeminity }
  const canRetry = await handleRetry(outcome, nextAttempt, retryConfig)

  if (canRetry) {
    return attempt(input, init, config, refreshQueue, nextAttempt)
  }

  await emitterCallback(classifyOutcome(outcome), outcome, config)

  if (outcome.response) {
    return outcome.response
  }

  throw outcome.error
}

/**
 * Runs one logical fetch call through the full lifecycle: auth attachment,
 * the underlying `fetch`, and retry/event handling on failure. Always resolves
 * with a `Response` on the happy path or a failed-but-received response
 * (mirroring native `fetch`'s contract); only rejects for network failures,
 * aborts, or timeouts that exhaust retries.
 */
export function performRequest(
  input: RequestInfo | URL,
  init: FetchRequestInit,
  config: Config,
  refreshQueue: RefreshQueue
): Promise<Response> {
  return attempt(input, init, config, refreshQueue, 0)
}
