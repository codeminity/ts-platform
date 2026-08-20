import { describe, expect, it } from 'vitest'

import { createAuthorizationHeader } from './create-auth-header.js'

describe(createAuthorizationHeader, () => {
  it('overwrites existing authorization header', () => {
    const headers = new Headers({ Authorization: 'Bearer old-token' })

    const result = createAuthorizationHeader(headers, 'new-token')

    expect(result.get('Authorization')).toBe('Bearer new-token')
  })
})
