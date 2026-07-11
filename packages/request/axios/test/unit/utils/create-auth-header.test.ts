import { AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'

import { createAuthorizationHeader } from '../../../src/utils/create-auth-header'

describe('createAuthorizationHeader', () => {
  it('adds authorization header to existing headers', () => {
    const headers = AxiosHeaders.from({
      Accept: 'application/json'
    })

    const result = createAuthorizationHeader(headers, 'token123')

    expect(result.get('Authorization')).toBe('Bearer token123')
    expect(result.get('Accept')).toBe('application/json')
  })

  it('creates authorization header when headers are empty', () => {
    const result = createAuthorizationHeader(AxiosHeaders.from(), 'token123')

    expect(result.get('Authorization')).toBe('Bearer token123')
  })

  it('overwrites existing authorization header', () => {
    const headers = AxiosHeaders.from({
      Authorization: 'Bearer old-token'
    })

    const result = createAuthorizationHeader(headers, 'new-token')

    expect(result.get('Authorization')).toBe('Bearer new-token')
  })

  it('returns an AxiosHeaders instance', () => {
    const result = createAuthorizationHeader(AxiosHeaders.from(), 'token123')

    expect(result).toBeInstanceOf(AxiosHeaders)
  })
})
