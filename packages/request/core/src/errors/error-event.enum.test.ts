import { describe, expect, it } from 'vitest'

import { ErrorEventEnum } from './error-event.enum'

describe('ErrorEventEnum', () => {
  it('exposes the expected error event kinds', () => {
    expect(ErrorEventEnum).toEqual({
      NETWORK: 'network',
      TIMEOUT: 'timeout',
      ABORT: 'abort',

      AUTH_REFRESH_FAILED: 'auth_refresh_failed',
      AUTH_TOKEN_FAILED: 'auth_token_failed',

      UNKNOWN: 'unknown'
    })
  })
})
