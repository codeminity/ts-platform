import { bench, describe } from 'vitest'

import { createAuthorizationHeader } from '../src/auth/create-auth-header'

const existingHeaders = { Accept: 'application/json', 'X-Request-Id': 'abc123' }

describe('createAuthorizationHeader (fetch)', () => {
  bench('no existing headers', () => {
    createAuthorizationHeader(undefined, 'token')
  })

  bench('several existing headers preserved', () => {
    createAuthorizationHeader(existingHeaders, 'token')
  })
})
