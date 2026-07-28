import { describe, expect, it } from 'vitest'

import { createAuthorizationHeader } from './create-auth-header'

describe('createAuthorizationHeader', () => {
  it('adds authorization header to existing headers', () => {
    const headers = new Headers({ Accept: 'application/json' })

    const result = createAuthorizationHeader(headers, 'token123')

    expect(result.get('Authorization')).toBe('Bearer token123')
    expect(result.get('Accept')).toBe('application/json')
  })

  it('creates authorization header when headers are undefined', () => {
    const result = createAuthorizationHeader(undefined, 'token123')

    expect(result.get('Authorization')).toBe('Bearer token123')
  })

  it('overwrites existing authorization header', () => {
    const headers = new Headers({ Authorization: 'Bearer old-token' })

    const result = createAuthorizationHeader(headers, 'new-token')

    expect(result.get('Authorization')).toBe('Bearer new-token')
  })

  it('returns a Headers instance', () => {
    const result = createAuthorizationHeader(undefined, 'token123')

    expect(result).toBeInstanceOf(Headers)
  })
})
