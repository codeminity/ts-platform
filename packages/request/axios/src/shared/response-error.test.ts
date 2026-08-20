import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { emitterCallback } from '@codeminity/request-core'

import { mapErrorToEvent } from '../errors/error-to-event.js'
import { handleRetry } from '../retry/retry.js'

import { handleResponseError } from './response-error.js'

import type { Config } from './config.interface.js'
import type { InternalRequestConfig } from './request-config.interface.js'
import type { AxiosInstance } from 'axios'

type Request = AxiosInstance['request']

vi.mock(import('@codeminity/request-core'), () => ({
  // `emitterCallback` is generic — Vitest's `Mock<>` wrapper can't preserve
  // that, so it's typed against one concrete instantiation and cast back.
  emitterCallback: vi.fn<
    (event: string, outcome: unknown, callbacks: unknown) => Promise<void>
  >() as unknown as typeof emitterCallback
}))

vi.mock(import('../retry/retry.js'), () => ({
  handleRetry: vi.fn<typeof handleRetry>()
}))

vi.mock(import('../errors/error-to-event.js'), () => ({
  mapErrorToEvent: vi.fn<typeof mapErrorToEvent>()
}))

describe(handleResponseError, () => {
  let instance: AxiosInstance
  let request: ReturnType<typeof vi.fn<Request>>

  beforeEach(() => {
    vi.clearAllMocks()

    request = vi.fn<Request>()

    instance = {
      request
    } as unknown as AxiosInstance

    vi.mocked(mapErrorToEvent).mockReturnValue('abort')
  })

  it('throws non-Axios errors', async () => {
    const error = new Error('boom')

    await expect(handleResponseError(instance, {}, error)).rejects.toThrow(error)

    expect(handleRetry).not.toHaveBeenCalled()
    expect(emitterCallback).not.toHaveBeenCalled()
  })

  it('emits event when request config is missing', async () => {
    const error = new AxiosError('boom')
    delete (error as Partial<AxiosError>).config

    await expect(handleResponseError(instance, {}, error)).rejects.toBe(error)

    expect(emitterCallback).toHaveBeenCalledTimes(1)
    expect(handleRetry).not.toHaveBeenCalled()
  })

  it('increments request attempt', async () => {
    const requestConfig = {
      url: '/users',
      attempt: 5,
      codeminity: {}
    } as InternalRequestConfig

    const error = new AxiosError('boom')
    error.config = requestConfig

    vi.mocked(handleRetry).mockResolvedValue(true)

    request.mockResolvedValue({})

    await handleResponseError(instance, {}, error)

    expect(request).toHaveBeenCalledWith({
      ...requestConfig,
      attempt: 6
    })
  })

  it('falls back to global config when request config is missing', async () => {
    const globalConfig = {
      retries: 5
    } as Config

    const requestConfig = {
      url: '/users'
    } as InternalRequestConfig

    const error = new AxiosError('boom')
    error.config = requestConfig

    vi.mocked(handleRetry).mockResolvedValue(false)

    await expect(handleResponseError(instance, globalConfig, error)).rejects.toBe(error)

    expect(handleRetry).toHaveBeenCalledWith(error, 1, globalConfig, requestConfig.signal)
  })
})
