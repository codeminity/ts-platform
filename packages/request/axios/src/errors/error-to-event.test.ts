import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'

import { mapErrorToEvent } from './error-to-event.js'

describe(mapErrorToEvent, () => {
  it('returns unknown when neither code nor status exists', () => {
    expect(mapErrorToEvent(new AxiosError('error'))).toBe('unknown')
  })
})
