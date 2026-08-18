import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { createFetchOutcome } from '../shared/mocks/create-fetch-outcome.js'

import { classifyOutcome } from './outcome-to-event.js'

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

describe('classifyOutcome (property-based)', () => {
  it('maps every known status to its exact event, for any status in the real HTTP range', () => {
    fc.assert(
      fc.property(fc.constantFrom(...KNOWN_STATUS_EVENTS.keys()), (status) => {
        const outcome = createFetchOutcome({ response: new Response(null, { status }) })

        expect(classifyOutcome(outcome)).toBe(KNOWN_STATUS_EVENTS.get(status))
      })
    )
  })

  it('maps any status outside the known set to "unknown"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 599 }).filter((status) => !KNOWN_STATUS_EVENTS.has(status)),
        (status) => {
          const outcome = createFetchOutcome({ response: new Response(null, { status }) })

          expect(classifyOutcome(outcome)).toBe('unknown')
        }
      )
    )
  })

  it('classifies any non-Error, non-DOMException thrown value as "unknown"', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (thrown) => {
          const outcome = createFetchOutcome({ error: thrown })

          expect(classifyOutcome(outcome)).toBe('unknown')
        }
      )
    )
  })

  it('classifies any TypeError as "network"', () => {
    fc.assert(
      fc.property(fc.string(), (message) => {
        const outcome = createFetchOutcome({ error: new TypeError(message) })

        expect(classifyOutcome(outcome)).toBe('network')
      })
    )
  })

  it('classifies a DOMException by name: AbortError/TimeoutError map, everything else is "unknown"', () => {
    const KNOWN_NAMES = new Map([
      ['AbortError', 'abort'],
      ['TimeoutError', 'timeout']
    ])

    fc.assert(
      fc.property(fc.string(), (name) => {
        const outcome = createFetchOutcome({ error: new DOMException('x', name) })

        expect(classifyOutcome(outcome)).toBe(KNOWN_NAMES.get(name) ?? 'unknown')
      })
    )
  })
})
