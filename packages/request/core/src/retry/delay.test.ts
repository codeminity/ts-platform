import { describe, it, expect, vi, afterEach } from 'vitest'

import { delay } from './delay'

describe('delay', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves after the specified delay', async () => {
    vi.useFakeTimers()

    let resolved = false

    const promise = delay(1000).then(() => {
      resolved = true
    })

    await vi.advanceTimersByTimeAsync(999)

    expect(resolved).toBe(false)

    await vi.advanceTimersByTimeAsync(1)

    await promise

    expect(resolved).toBe(true)
  })

  it('resolves with undefined', async () => {
    await expect(delay(100)).resolves.toBeUndefined()
  })
})
