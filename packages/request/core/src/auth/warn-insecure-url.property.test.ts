import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { isInsecureUrl } from './warn-insecure-url'

const protocol = fc.constantFrom('https:', 'http:', 'ftp:', 'ws:', 'wss:')
const hostname = fc.constantFrom(
  'localhost',
  '127.0.0.1',
  '::1',
  'example.com',
  'api.example.com',
  '192.168.1.1'
)

describe('isInsecureUrl (property-based)', () => {
  it('is true exactly when the protocol is not https and the hostname is not a loopback address', () => {
    fc.assert(
      fc.property(protocol, hostname, (proto, host) => {
        const isIpv6 = host === '::1'
        const url = `${proto}//${isIpv6 ? `[${host}]` : host}/path`

        const expected =
          proto !== 'https:' && host !== 'localhost' && host !== '127.0.0.1' && host !== '::1'

        expect(isInsecureUrl(url)).toBe(expected)
      })
    )
  })

  it('is always false for a string that cannot be parsed as a URL', () => {
    fc.assert(
      fc.property(
        fc.string().filter((value) => {
          try {
            new URL(value)
            return false
          } catch {
            return true
          }
        }),
        (invalid) => {
          expect(isInsecureUrl(invalid)).toBe(false)
        }
      )
    )
  })
})
