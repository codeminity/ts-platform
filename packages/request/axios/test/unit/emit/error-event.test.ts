import { describe, expect, it, vi } from 'vitest'

import { emitterCallback } from '../../../src/emit/error-event'
import { ErrorEventEnum } from '../../../src/enum/error-event'
import { type CallbackConfig } from '../../../src/interfaces/callback-config'

import type { AxiosError } from 'axios'

describe('emitterCallback', () => {
  it('calls onEvent and onError when both callbacks are provided', async () => {
    const onEvent = vi.fn()
    const onError = vi.fn()

    const config: CallbackConfig = {
      onEvent,
      onError
    }

    const error = {} as AxiosError

    await emitterCallback(ErrorEventEnum.ABORT, error, config)

    expect(onEvent).toHaveBeenCalledWith(ErrorEventEnum.ABORT, error)
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('calls only onEvent when onError is not provided', async () => {
    const onEvent = vi.fn()

    const config: CallbackConfig = {
      onEvent
    }

    const error = {} as AxiosError

    await emitterCallback(ErrorEventEnum.ABORT, error, config)

    expect(onEvent).toHaveBeenCalledWith(ErrorEventEnum.ABORT, error)
  })

  it('calls only onError when onEvent is not provided', async () => {
    const onError = vi.fn()

    const config: CallbackConfig = {
      onError
    }

    const error = {} as AxiosError

    await emitterCallback(ErrorEventEnum.ABORT, error, config)

    expect(onError).toHaveBeenCalledWith(error)
  })

  it('does nothing when no callbacks are provided', async () => {
    const config: CallbackConfig = {}

    const error = {} as AxiosError

    await expect(emitterCallback(ErrorEventEnum.ABORT, error, config)).resolves.toBeUndefined()
  })
})
