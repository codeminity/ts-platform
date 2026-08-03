import { describe, expect, it } from 'vitest'

import { createFetchOutcome } from '../mocks/create-fetch-outcome.js'

import { classifyOutcome } from './outcome-to-event.js'

import type { FetchOutcome } from './fetch-outcome.interface.js'

function responseOutcome(status: number): FetchOutcome {
  return createFetchOutcome({ response: new Response(null, { status }) })
}

describe('classifyOutcome', () => {
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
  ])('maps response status %i to %s', (status, event) => {
    expect(classifyOutcome(responseOutcome(status))).toBe(event)
  })

  it('returns unknown for unmapped status codes', () => {
    expect(classifyOutcome(responseOutcome(418))).toBe('unknown')
  })

  it('maps a TypeError (network failure) to network', () => {
    expect(classifyOutcome(createFetchOutcome({ error: new TypeError('fetch failed') }))).toBe(
      'network'
    )
  })

  it('maps an AbortError DOMException to abort', () => {
    const error = new DOMException('The operation was aborted', 'AbortError')
    expect(classifyOutcome(createFetchOutcome({ error }))).toBe('abort')
  })

  it('maps a TimeoutError DOMException (AbortSignal.timeout) to timeout', () => {
    const error = new DOMException('The operation timed out', 'TimeoutError')
    expect(classifyOutcome(createFetchOutcome({ error }))).toBe('timeout')
  })

  it('returns unknown for an unrecognized thrown value', () => {
    expect(classifyOutcome(createFetchOutcome({ error: 'not an error instance' }))).toBe('unknown')
  })

  it('returns unknown for a nullish thrown value, without throwing', () => {
    expect(classifyOutcome(createFetchOutcome({ error: null }))).toBe('unknown')
  })

  it('returns unknown for an unrecognized DOMException name', () => {
    const error = new DOMException('Something else', 'SyntaxError')
    expect(classifyOutcome(createFetchOutcome({ error }))).toBe('unknown')
  })

  it('prioritizes response over error when both are somehow present', () => {
    expect(classifyOutcome({ ...responseOutcome(404), error: new TypeError('x') })).toBe(
      'not_found'
    )
  })
})
