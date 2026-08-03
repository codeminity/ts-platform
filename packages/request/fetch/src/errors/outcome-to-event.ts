import type { ErrorEvent } from './error-event.type.js'
import type { FetchOutcome } from './fetch-outcome.interface.js'

function classifyThrown(error: unknown): ErrorEvent {
  if (error instanceof DOMException) {
    if (error.name === 'AbortError') return 'abort'
    if (error.name === 'TimeoutError') return 'timeout'
  }

  if (error instanceof TypeError) return 'network'

  return 'unknown'
}

function classifyStatus(status: number): ErrorEvent {
  switch (status) {
    case 400:
      return 'bad_request'
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 404:
      return 'not_found'
    case 409:
      return 'conflict'
    case 422:
      return 'unprocessable_entity'
    case 429:
      return 'too_many_requests'
    case 500:
      return 'internal_error'
    case 502:
      return 'bad_gateway'
    case 503:
      return 'service_unavailable'
    case 504:
      return 'gateway_timeout'
    default:
      return 'unknown'
  }
}

/**
 * Classifies a failed fetch outcome (a non-`ok` response, or a thrown network/abort
 * error) into one of {@link ErrorEvent}'s values, for the `onEvent` callback.
 *
 * @public
 */
export function classifyOutcome(outcome: FetchOutcome): ErrorEvent {
  if (outcome.response) return classifyStatus(outcome.response.status)

  return classifyThrown(outcome.error)
}
