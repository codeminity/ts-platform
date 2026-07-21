import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { emitterCallback } from '../errors/emit-error-event'
import { mapErrorToEvent } from '../errors/error-to-event'
import { handleRetry } from '../retry/retry'

import { handleResponseError } from './response-error'

import type { Config } from './config.interface'
import type { InternalRequestConfig } from './request-config.interface'
import type { AxiosInstance, AxiosResponse } from 'axios'

vi.mock('../errors/emit-error-event.ts', () => ({
  emitterCallback: vi.fn()
}))

vi.mock('../retry/retry.ts', () => ({
  handleRetry: vi.fn()
}))

vi.mock('../errors/error-to-event.ts', () => ({
  mapErrorToEvent: vi.fn()
}))

describe('handleResponseError', () => {
  let instance: AxiosInstance
  let request: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    request = vi.fn()

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

  it('retries request when retry is allowed', async () => {
    const requestConfig = {
      url: '/users',
      codeminity: {}
    } as InternalRequestConfig

    const error = new AxiosError('boom')
    error.config = requestConfig

    vi.mocked(handleRetry).mockResolvedValue(true)

    const response = { data: 'ok' }

    request.mockResolvedValue(response)

    const result = await handleResponseError(instance, {}, error)

    expect(handleRetry).toHaveBeenCalledWith(error, 1, requestConfig.codeminity)

    expect(request).toHaveBeenCalledWith({
      ...requestConfig,
      attempt: 1
    })

    expect(result).toBe(response)
  })

  it('emits event when retry is denied', async () => {
    const requestConfig = {
      url: '/users',
      codeminity: {}
    } as InternalRequestConfig

    const error = new AxiosError('boom')
    error.config = requestConfig

    vi.mocked(handleRetry).mockResolvedValue(false)

    await expect(handleResponseError(instance, {}, error)).rejects.toBe(error)

    expect(request).not.toHaveBeenCalled()
    expect(emitterCallback).toHaveBeenCalledTimes(1)
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

    expect(handleRetry).toHaveBeenCalledWith(error, 1, globalConfig)
  })

  it('merges global retry config with per-request override', async () => {
    const globalConfig = {
      retries: 3,
      retryOnStatuses: [502, 503, 504]
    } as Config

    const requestConfig = {
      url: '/reports/annual',
      codeminity: {
        retries: 1,
        retryDelay: 5
      }
    } as InternalRequestConfig

    const error = new AxiosError('boom')
    error.config = requestConfig
    error.response = {
      status: 503,
      statusText: '',
      headers: {},
      config: {} as AxiosResponse['config'],
      data: undefined
    } satisfies AxiosResponse

    vi.mocked(handleRetry).mockResolvedValue(true)

    request.mockResolvedValue({ data: 'ok' })

    await expect(handleResponseError(instance, globalConfig, error)).resolves.toEqual({
      data: 'ok'
    })

    expect(handleRetry).toHaveBeenCalledWith(error, 1, {
      retries: 1,
      retryDelay: 5,
      retryOnStatuses: [502, 503, 504]
    })

    expect(request).toHaveBeenCalledTimes(1)
  })
})
