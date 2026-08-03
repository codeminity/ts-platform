import { AxiosError, type AxiosResponse } from 'axios'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { mapErrorToEvent } from './error-to-event.js'

const KNOWN_STATUS_EVENTS = new Map([
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
])

function errorWithStatus(status: number | undefined): AxiosError {
  const error = new AxiosError('error')

  if (status != null) {
    error.response = {
      status,
      statusText: '',
      headers: {},
      config: {} as AxiosResponse['config'],
      data: undefined
    } as AxiosResponse
  }

  return error
}

describe('mapErrorToEvent (property-based)', () => {
  it('maps every known status to its exact event, for any status in the real HTTP range', () => {
    fc.assert(
      fc.property(fc.constantFrom(...KNOWN_STATUS_EVENTS.keys()), (status) => {
        expect(mapErrorToEvent(errorWithStatus(status))).toBe(KNOWN_STATUS_EVENTS.get(status))
      })
    )
  })

  it('maps any status outside the known set to "unknown"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 599 }).filter((status) => !KNOWN_STATUS_EVENTS.has(status)),
        (status) => {
          expect(mapErrorToEvent(errorWithStatus(status))).toBe('unknown')
        }
      )
    )
  })

  it('error.code always wins over status, for any status', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('ERR_NETWORK', 'ECONNABORTED', 'ERR_CANCELED'),
        fc.option(fc.integer({ min: 100, max: 599 }), { nil: undefined }),
        (code, status) => {
          const error = errorWithStatus(status)
          error.code = code

          const expected = {
            ERR_NETWORK: 'network',
            ECONNABORTED: 'timeout',
            ERR_CANCELED: 'abort'
          }[code]

          expect(mapErrorToEvent(error)).toBe(expected)
        }
      )
    )
  })
})
