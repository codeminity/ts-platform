import { describe, it, expect } from 'vitest'

import { resolveRetryDelay } from './resolve-retry-delay.js'

describe(resolveRetryDelay, () => {
  it('resolves to 0 when both the configured and suggested delays are non-positive', () => {
    expect(resolveRetryDelay(-100)).toBe(0)
  })
})
