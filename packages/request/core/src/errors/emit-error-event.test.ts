import { describe, expect, it, vi } from 'vitest'

import { emitterCallback } from './emit-error-event.js'

import type { EventCallbacks } from './emit-error-event.js'

describe('emitterCallback', () => {
  it('calls onEvent and onError when both callbacks are provided', async () => {
    const onEvent = vi.fn()
    const onError = vi.fn()

    const callbacks: EventCallbacks<string, { code: number }> = { onEvent, onError }
    const outcome = { code: 1 }

    await emitterCallback('abort', outcome, callbacks)

    expect(onEvent).toHaveBeenCalledWith('abort', outcome)
    expect(onError).toHaveBeenCalledWith(outcome)
  })

  it('calls only onEvent when onError is not provided', async () => {
    const onEvent = vi.fn()

    await emitterCallback('abort', { code: 1 }, { onEvent })

    expect(onEvent).toHaveBeenCalledWith('abort', { code: 1 })
  })

  it('calls only onError when onEvent is not provided', async () => {
    const onError = vi.fn()

    await emitterCallback('abort', { code: 1 }, { onError })

    expect(onError).toHaveBeenCalledWith({ code: 1 })
  })

  it('does nothing when no callbacks are provided', async () => {
    await expect(emitterCallback('abort', { code: 1 }, {})).resolves.toBeUndefined()
  })

  it('ignores onEvent callback errors', async () => {
    const onEvent = vi.fn().mockRejectedValue(new Error('event callback failed'))

    await expect(emitterCallback('abort', { code: 1 }, { onEvent })).resolves.toBeUndefined()

    expect(onEvent).toHaveBeenCalledWith('abort', { code: 1 })
  })

  it('ignores onError callback errors', async () => {
    const onError = vi.fn().mockRejectedValue(new Error('error callback failed'))

    await expect(emitterCallback('abort', { code: 1 }, { onError })).resolves.toBeUndefined()

    expect(onError).toHaveBeenCalledWith({ code: 1 })
  })

  it('still calls onError when onEvent throws', async () => {
    const onEvent = vi.fn().mockRejectedValue(new Error('event failed'))
    const onError = vi.fn()

    await expect(
      emitterCallback('abort', { code: 1 }, { onEvent, onError })
    ).resolves.toBeUndefined()

    expect(onEvent).toHaveBeenCalledWith('abort', { code: 1 })
    expect(onError).toHaveBeenCalledWith({ code: 1 })
  })

  it('calls onEvent even though onError throws', async () => {
    const onEvent = vi.fn()
    const onError = vi.fn().mockRejectedValue(new Error('error callback failed'))

    await expect(
      emitterCallback('abort', { code: 1 }, { onEvent, onError })
    ).resolves.toBeUndefined()

    expect(onEvent).toHaveBeenCalledWith('abort', { code: 1 })
    expect(onError).toHaveBeenCalledWith({ code: 1 })
  })
})
