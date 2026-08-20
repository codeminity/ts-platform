import { describe, expect, it } from 'vitest'

import { createFetchOutcome } from '../shared/mocks/create-fetch-outcome.js'

import { classifyOutcome } from './outcome-to-event.js'

describe(classifyOutcome, () => {
  it('maps an AbortError DOMException to abort', () => {
    const error = new DOMException('The operation was aborted', 'AbortError')

    expect(classifyOutcome(createFetchOutcome({ error }))).toBe('abort')
  })

  it('maps a TimeoutError DOMException (AbortSignal.timeout) to timeout', () => {
    const error = new DOMException('The operation timed out', 'TimeoutError')

    expect(classifyOutcome(createFetchOutcome({ error }))).toBe('timeout')
  })
})
