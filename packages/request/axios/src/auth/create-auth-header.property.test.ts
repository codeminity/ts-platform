import { AxiosHeaders } from 'axios'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { createAuthorizationHeader } from './create-auth-header.js'

const headerName = fc.constantFrom(
  'Accept',
  'Content-Type',
  'X-Request-Id',
  'X-Custom-Header',
  'User-Agent',
  'Cache-Control'
)
// Leading/trailing whitespace is stripped from header values by the
// underlying Headers spec (not this function's concern) — excluded so the
// property reflects a real header value/token, not platform trimming.
const trimmed = (value: string) => value.trim() === value && value.length > 0

const headerValue = fc
  .string({ unit: 'grapheme-ascii', minLength: 1, maxLength: 30 })
  .filter(trimmed)
const token = fc.string({ unit: 'grapheme-ascii', minLength: 1, maxLength: 100 }).filter(trimmed)

describe('createAuthorizationHeader (property-based)', () => {
  it('sets Authorization to exactly "Bearer <token>" while leaving every other header untouched', () => {
    fc.assert(
      fc.property(
        fc.dictionary(headerName, headerValue, { minKeys: 0, maxKeys: 5 }),
        token,
        (existingHeaders, tokenValue) => {
          const headers = AxiosHeaders.from(existingHeaders)

          const result = createAuthorizationHeader(headers, tokenValue)

          expect(result.get('Authorization')).toBe(`Bearer ${tokenValue}`)

          for (const [name, value] of Object.entries(existingHeaders)) {
            expect(result.get(name)).toBe(value)
          }
        }
      )
    )
  })
})
