import { AxiosHeaders } from 'axios'
import { bench, describe } from 'vitest'

import { createAuthorizationHeader } from '../src/auth/create-auth-header'

const emptyHeaders = new AxiosHeaders()
const existingHeaders = new AxiosHeaders({ Accept: 'application/json', 'X-Request-Id': 'abc123' })

describe('createAuthorizationHeader (axios)', () => {
  bench('no existing headers', () => {
    createAuthorizationHeader(emptyHeaders, 'token')
  })

  bench('several existing headers preserved', () => {
    createAuthorizationHeader(existingHeaders, 'token')
  })
})
