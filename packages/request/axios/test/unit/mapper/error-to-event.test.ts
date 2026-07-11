import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'

import { mapErrorToEvent } from '../../../src/mapper/error-to-event'

function createError(code?: string, status?: number): AxiosError {
  const error = new AxiosError('error')

  if (code) {
    error.code = code
  }

  if (status != null) {
    error.response = {
      status
    } as AxiosError['response']
  }

  return error
}

describe('mapErrorToEvent', () => {
  it.each([
    ['ERR_NETWORK', 'network'],
    ['ECONNABORTED', 'timeout'],
    ['ERR_CANCELED', 'abort']
  ])('maps error code %s to %s', (code, event) => {
    expect(mapErrorToEvent(createError(code))).toBe(event)
  })

  it.each([
    [400, 'bad_request'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [422, 'unprocessable_entity'],
    [429, 'too_many_requests'],
    [500, 'internal_error'],
    [502, 'bad_gateway'],
    [503, 'service_unavailable'],
    [504, 'gateway_timeout']
  ])('maps status %i to %s', (status, event) => {
    expect(mapErrorToEvent(createError(undefined, status))).toBe(event)
  })

  it('returns unknown for unmapped status codes', () => {
    expect(mapErrorToEvent(createError(undefined, 418))).toBe('unknown')
  })

  it('returns unknown when neither code nor status exists', () => {
    expect(mapErrorToEvent(createError())).toBe('unknown')
  })

  it('prioritizes error code over status code', () => {
    const error = createError('ERR_NETWORK', 500)

    expect(mapErrorToEvent(error)).toBe('network')
  })
})
