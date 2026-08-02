import { AxiosError } from 'axios'
import { bench, describe } from 'vitest'

import { mapErrorToEvent } from '../src/errors/error-to-event'

function errorWithStatus(status: number | undefined): AxiosError {
  const error = new AxiosError('error')

  if (status != null) {
    error.response = { status, statusText: '', headers: {}, config: {}, data: undefined } as never
  }

  return error
}

const knownStatusError = errorWithStatus(503)
const unknownStatusError = errorWithStatus(418)
const noResponseError = errorWithStatus(undefined)
const networkError = Object.assign(new AxiosError('network'), { code: 'ERR_NETWORK' })

describe('mapErrorToEvent', () => {
  bench('known status code', () => {
    mapErrorToEvent(knownStatusError)
  })

  bench('unknown status code', () => {
    mapErrorToEvent(unknownStatusError)
  })

  bench('no response at all', () => {
    mapErrorToEvent(noResponseError)
  })

  bench('error.code short-circuit (ERR_NETWORK)', () => {
    mapErrorToEvent(networkError)
  })
})
