import type { ErrorEvent } from './error-event.type'
import type { AxiosError } from 'axios'

export function mapErrorToEvent(error: AxiosError): ErrorEvent {
  if (error.code === 'ERR_NETWORK') return 'network'
  if (error.code === 'ECONNABORTED') return 'timeout'
  if (error.code === 'ERR_CANCELED') return 'abort'

  const status = error.response?.status

  if (status != null) {
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

  return 'unknown'
}
