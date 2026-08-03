import { afterEach, describe, expect, it, vi } from 'vitest'

import { isInsecureUrl, warnIfInsecureUrl } from './warn-insecure-url.js'

describe('isInsecureUrl', () => {
  it('returns true for a plain http URL', () => {
    expect(isInsecureUrl('http://example.com/path')).toBe(true)
  })

  it('returns false for an https URL', () => {
    expect(isInsecureUrl('https://example.com/path')).toBe(false)
  })

  it('returns false for http://localhost', () => {
    expect(isInsecureUrl('http://localhost:3000/path')).toBe(false)
  })

  it('returns false for http://127.0.0.1', () => {
    expect(isInsecureUrl('http://127.0.0.1:3000/path')).toBe(false)
  })

  it('returns false for http://[::1]', () => {
    expect(isInsecureUrl('http://[::1]:3000/path')).toBe(false)
  })

  it('returns false for an unparseable string', () => {
    expect(isInsecureUrl('not a url')).toBe(false)
  })
})

describe('warnIfInsecureUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('warns once for an insecure origin, with the full expected message', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    warnIfInsecureUrl('http://example-warn-once.test/a')

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toBe(
      '[codeminity] Sending credentials to a non-HTTPS origin (http://example-warn-once.test). ' +
        'Credentials should only be sent over HTTPS.'
    )
  })

  it('does not warn again for an origin it already warned about', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    warnIfInsecureUrl('http://example-warn-dedup.test/a')
    warnIfInsecureUrl('http://example-warn-dedup.test/b')

    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('does not warn for a secure URL', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    warnIfInsecureUrl('https://example-warn-secure.test/a')

    expect(warn).not.toHaveBeenCalled()
  })

  it('does not warn for a loopback URL', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    warnIfInsecureUrl('http://localhost:4000/a')

    expect(warn).not.toHaveBeenCalled()
  })

  it('does not warn and does not throw for an unparseable URL', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(() => {
      warnIfInsecureUrl('not a url')
    }).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })
})
