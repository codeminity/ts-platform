import { describe, it, expect, vi, afterEach } from 'vitest'

import { delay } from './delay.js'

describe(delay, () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves with undefined', async () => {
    await expect(delay(100)).resolves.toBeUndefined()
  })

  it('resolves immediately when the signal is already aborted, without waiting for a timer', async () => {
    vi.useFakeTimers()

    const controller = new AbortController()

    controller.abort()

    let resolved = false

    void delay(1000, controller.signal).then(() => {
      resolved = true
    })

    // Flush microtasks only — no timer is advanced, so this only passes if
    // the already-aborted check resolves synchronously within the executor.
    await Promise.resolve()
    await Promise.resolve()

    expect(resolved).toBe(true)
  })

  it('falls back to a plain timer when the signal has no addEventListener/removeEventListener', async () => {
    vi.useFakeTimers()

    const signal = { aborted: false }

    const promise = delay(100, signal)

    await vi.advanceTimersByTimeAsync(100)

    await expect(promise).resolves.toBeUndefined()
  })

  it('cleans up its abort listener once the timer fires normally', async () => {
    vi.useFakeTimers()

    const controller = new AbortController()
    const removeEventListener = vi.spyOn(controller.signal, 'removeEventListener')

    const promise = delay(100, controller.signal)

    await vi.advanceTimersByTimeAsync(100)
    await promise

    expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function))
  })

  it('cleans up its own abort listener once the signal aborts', async () => {
    vi.useFakeTimers()

    const controller = new AbortController()
    const removeEventListener = vi.spyOn(controller.signal, 'removeEventListener')

    const promise = delay(1000, controller.signal)

    await vi.advanceTimersByTimeAsync(10)
    controller.abort()
    await promise

    expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function))
  })
})
