import { describe, it, expect, vi, afterEach } from 'vitest'

import { applyRetryJitter } from './apply-retry-jitter.js'

describe(applyRetryJitter, () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the delay unchanged when jitter is "none"', () => {
    expect(applyRetryJitter(1000, 'none')).toBe(1000)
  })

  it('picks a value between 0 and the delay for "full" jitter', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    expect(applyRetryJitter(1000, 'full')).toBe(500)
  })

  it('keeps at least half of the delay for "equal" jitter', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    expect(applyRetryJitter(1000, 'equal')).toBe(500)
  })

  it('caps "equal" jitter at the full delay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)

    expect(applyRetryJitter(1000, 'equal')).toBe(1000)
  })
})
