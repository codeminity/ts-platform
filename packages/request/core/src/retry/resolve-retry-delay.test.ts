import { describe, it, expect } from 'vitest'

import { resolveRetryDelay } from './resolve-retry-delay.js'

describe(resolveRetryDelay, () => {
  it('returns the configured delay when no suggested delay is given', () => {
    expect(resolveRetryDelay(500)).toBe(500)
  })

  it('returns the suggested delay when it is larger than the configured delay', () => {
    expect(resolveRetryDelay(500, 800)).toBe(800)
  })

  it('returns the configured delay when it is larger than the suggested delay', () => {
    expect(resolveRetryDelay(500, 100)).toBe(500)
  })

  it('caps the result at the default maximum', () => {
    expect(resolveRetryDelay(999_999, 999_999)).toBe(300_000)
  })

  it('respects a custom maximum', () => {
    expect(resolveRetryDelay(0, 5000, 1000)).toBe(1000)
  })

  it('treats a negative suggested delay as having no effect', () => {
    expect(resolveRetryDelay(500, -1000)).toBe(500)
  })

  it('resolves to 0 when both the configured and suggested delays are non-positive', () => {
    expect(resolveRetryDelay(-100)).toBe(0)
  })
})
