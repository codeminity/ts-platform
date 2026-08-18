import { bench, describe } from 'vitest'

import { classifyOutcome } from '../src/errors/outcome-to-event'
import { createFetchOutcome } from '../src/shared/mocks/create-fetch-outcome'

const knownStatusOutcome = createFetchOutcome({ response: new Response(null, { status: 503 }) })
const unknownStatusOutcome = createFetchOutcome({ response: new Response(null, { status: 418 }) })
const abortOutcome = createFetchOutcome({ error: new DOMException('aborted', 'AbortError') })
const networkOutcome = createFetchOutcome({ error: new TypeError('network') })

describe('classifyOutcome', () => {
  bench('known status code', () => {
    classifyOutcome(knownStatusOutcome)
  })

  bench('unknown status code', () => {
    classifyOutcome(unknownStatusOutcome)
  })

  bench('DOMException (AbortError)', () => {
    classifyOutcome(abortOutcome)
  })

  bench('TypeError (network failure)', () => {
    classifyOutcome(networkOutcome)
  })
})
