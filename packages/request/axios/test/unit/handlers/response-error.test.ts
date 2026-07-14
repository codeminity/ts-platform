import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { emitterCallback } from '../../../src/emit/error-event'
import { handleResponseError } from '../../../src/handlers/response-error'
import { handleRetry } from '../../../src/handlers/retry'
import { mapErrorToEvent } from '../../../src/mapper/error-to-event'

import type { Config } from '../../../src/interfaces/config'
import type { InternalRequestConfig } from '../../../src/interfaces/request-config'
import type { AxiosInstance } from 'axios'

vi.mock('../../../src/emit/error-event', () => ({
  emitterCallback: vi.fn()
}))

vi.mock('../../../src/handlers/retry', () => ({
  handleRetry: vi.fn()
}))

vi.mock('../../../src/mapper/error-to-event', () => ({
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
    error.config = undefined

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
    error.response = { status: 503 } as AxiosError['response']

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
