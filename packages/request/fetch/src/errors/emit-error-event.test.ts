import { describe, expect, it, vi } from 'vitest'

import { createFetchOutcome } from '../mocks/create-fetch-outcome'

import { emitterCallback } from './emit-error-event'
import { ErrorEventEnum } from './error-event.enum'

import type { FetchOutcome } from './fetch-outcome.interface'
import type { CallbackConfig } from '../shared/callback-config.interface'

describe('emitterCallback', () => {
  it('calls onEvent and onError when both callbacks are provided', async () => {
    const onEvent = vi.fn()
    const onError = vi.fn()

    const config: CallbackConfig = { onEvent, onError }
    const outcome: FetchOutcome = createFetchOutcome({ error: new Error('boom') })

    await emitterCallback(ErrorEventEnum.ABORT, outcome, config)

    expect(onEvent).toHaveBeenCalledWith(ErrorEventEnum.ABORT, outcome)
    expect(onError).toHaveBeenCalledWith(outcome)
  })

  it('calls only onEvent when onError is not provided', async () => {
    const onEvent = vi.fn()

    const config: CallbackConfig = { onEvent }
    const outcome: FetchOutcome = createFetchOutcome({ error: new Error('boom') })

    await emitterCallback(ErrorEventEnum.ABORT, outcome, config)

    expect(onEvent).toHaveBeenCalledWith(ErrorEventEnum.ABORT, outcome)
  })

  it('calls only onError when onEvent is not provided', async () => {
    const onError = vi.fn()

    const config: CallbackConfig = { onError }
    const outcome: FetchOutcome = createFetchOutcome({ error: new Error('boom') })

    await emitterCallback(ErrorEventEnum.ABORT, outcome, config)

    expect(onError).toHaveBeenCalledWith(outcome)
  })

  it('does nothing when no callbacks are provided', async () => {
    const config: CallbackConfig = {}
    const outcome: FetchOutcome = createFetchOutcome({ error: new Error('boom') })

    await expect(emitterCallback(ErrorEventEnum.ABORT, outcome, config)).resolves.toBeUndefined()
  })

  it('ignores onEvent callback errors', async () => {
    const onEvent = vi.fn().mockRejectedValue(new Error('event callback failed'))

    const config: CallbackConfig = { onEvent }
    const outcome: FetchOutcome = createFetchOutcome({ error: new Error('boom') })

    await expect(emitterCallback(ErrorEventEnum.ABORT, outcome, config)).resolves.toBeUndefined()

    expect(onEvent).toHaveBeenCalledWith(ErrorEventEnum.ABORT, outcome)
  })

  it('ignores onError callback errors', async () => {
    const onError = vi.fn().mockRejectedValue(new Error('error callback failed'))

    const config: CallbackConfig = { onError }
    const outcome: FetchOutcome = createFetchOutcome({ error: new Error('boom') })

    await expect(emitterCallback(ErrorEventEnum.ABORT, outcome, config)).resolves.toBeUndefined()

    expect(onError).toHaveBeenCalledWith(outcome)
  })

  it('still calls onError when onEvent throws', async () => {
    const onEvent = vi.fn().mockRejectedValue(new Error('event failed'))
    const onError = vi.fn()

    const config: CallbackConfig = { onEvent, onError }
    const outcome: FetchOutcome = createFetchOutcome({ error: new Error('boom') })

    await expect(emitterCallback(ErrorEventEnum.ABORT, outcome, config)).resolves.toBeUndefined()

    expect(onEvent).toHaveBeenCalledWith(ErrorEventEnum.ABORT, outcome)
    expect(onError).toHaveBeenCalledWith(outcome)
  })

  it('calls onEvent even though onError throws', async () => {
    const onEvent = vi.fn()
    const onError = vi.fn().mockRejectedValue(new Error('error callback failed'))

    const config: CallbackConfig = { onEvent, onError }
    const outcome: FetchOutcome = createFetchOutcome({ error: new Error('boom') })

    await expect(emitterCallback(ErrorEventEnum.ABORT, outcome, config)).resolves.toBeUndefined()

    expect(onEvent).toHaveBeenCalledWith(ErrorEventEnum.ABORT, outcome)
    expect(onError).toHaveBeenCalledWith(outcome)
  })
})
