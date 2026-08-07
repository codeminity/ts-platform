import { describe, it, expect, vi, afterEach } from 'vitest'

import { delay } from './delay.js'

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

  it('resolves immediately once the signal aborts, without waiting out the full delay', async () => {
    vi.useFakeTimers()

    const controller = new AbortController()

    let resolved = false

    const promise = delay(1000, controller.signal).then(() => {
      resolved = true
    })

    await vi.advanceTimersByTimeAsync(10)

    expect(resolved).toBe(false)

    controller.abort()

    await promise

    expect(resolved).toBe(true)
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

  it('does not throw aborting a signal that has addEventListener but no removeEventListener', async () => {
    vi.useFakeTimers()

    let onAbort: (() => void) | undefined

    const signal = {
      aborted: false,
      addEventListener: (_type: 'abort', listener: () => void) => {
        onAbort = listener
      }
    }

    const promise = delay(1000, signal)

    await vi.advanceTimersByTimeAsync(10)
    onAbort?.()

    await expect(promise).resolves.toBeUndefined()
  })
})
