import { ErrorEventEnum as CoreErrorEventEnum } from '@codeminity/request-core'

export const ErrorEventEnum = {
  ...CoreErrorEventEnum,

  BAD_REQUEST: 'bad_request',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  UNPROCESSABLE_ENTITY: 'unprocessable_entity',
  TOO_MANY_REQUESTS: 'too_many_requests',

  INTERNAL_ERROR: 'internal_error',
  BAD_GATEWAY: 'bad_gateway',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  GATEWAY_TIMEOUT: 'gateway_timeout'
} as const
