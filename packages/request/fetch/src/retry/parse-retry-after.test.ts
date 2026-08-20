import { describe, it, expect, vi, afterEach } from 'vitest'

import { parseRetryAfter } from './parse-retry-after.js'

describe(parseRetryAfter, () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('parses a numeric-seconds value into milliseconds', () => {
    expect(parseRetryAfter('30')).toBe(30_000)
  })

  it('treats an HTTP-date in the past as 0, not negative', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z'))

    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:00 GMT')).toBe(0)
  })

  it('returns undefined for a value that is neither a number nor a valid date', () => {
    expect(parseRetryAfter('not-a-valid-header')).toBeUndefined()
  })
})
