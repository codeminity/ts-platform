import { describe, expect, it } from 'vitest'

import { createFetchOutcome } from '../shared/mocks/create-fetch-outcome.js'

import { classifyOutcome } from './outcome-to-event.js'

import type { FetchOutcome } from './fetch-outcome.interface.js'

function responseOutcome(status: number): FetchOutcome {
  return createFetchOutcome({ response: new Response(null, { status }) })
}

describe(classifyOutcome, () => {
  it.each([
    [400, 'bad_request'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [409, 'conflict'],
    [422, 'unprocessable_entity'],
    [429, 'too_many_requests'],
    [500, 'internal_error'],
    [502, 'bad_gateway'],
    [503, 'service_unavailable'],
    [504, 'gateway_timeout']
  ])('maps response status %i to %s', (status, event) => {
    expect(classifyOutcome(responseOutcome(status))).toBe(event)
  })

  it('maps an AbortError DOMException to abort', () => {
    const error = new DOMException('The operation was aborted', 'AbortError')

    expect(classifyOutcome(createFetchOutcome({ error }))).toBe('abort')
  })

  it('maps a TimeoutError DOMException (AbortSignal.timeout) to timeout', () => {
    const error = new DOMException('The operation timed out', 'TimeoutError')

    expect(classifyOutcome(createFetchOutcome({ error }))).toBe('timeout')
  })
})
