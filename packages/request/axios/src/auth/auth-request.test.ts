import { type AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TokenModeEnum } from '@codeminity/request-core'
import {
  createAuthConfig,
  createRefreshQueue as createRefreshQueueMock
} from '@codeminity/request-core/test-utils'

import { ErrorEventEnum } from '../errors/error-event.enum'
import { createRequestConfig } from '../mocks/create-request-config'

import { handleAuthRequest } from './auth-request'
import { dependencies } from './dependencies'

import type { Config } from '../shared/config.interface'

describe('handleAuthRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('enables withCredentials in COOKIE mode', async () => {
    const config = createAuthConfig({
      tokenMode: TokenModeEnum.COOKIE
    })

    const request = createRequestConfig()
    const queue = createRefreshQueueMock()

    const result = await handleAuthRequest(request, config, queue)

    expect(result.withCredentials).toBe(true)
  })

  it('calls refresh before token and sets header', async () => {
    const refreshSpy = vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    const getToken = vi.fn().mockResolvedValue('token123')

    const config = createAuthConfig({
      tokenMode: TokenModeEnum.JWT,
      getToken
    })

    const request = createRequestConfig()
    const queue = createRefreshQueueMock()

    const result = await handleAuthRequest(request, config, queue)

    expect(refreshSpy).toHaveBeenCalledTimes(1)
    expect(getToken).toHaveBeenCalledTimes(1)
    expect(result.headers.get('Authorization')).toBe('Bearer token123')
  })

  it('does not attempt token refresh when skipAuth is set for the request', async () => {
    const refreshSpy = vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    const getToken = vi.fn().mockResolvedValue('token123')

    const config = createAuthConfig({
      tokenMode: TokenModeEnum.JWT,
      getToken
    })

    const request = createRequestConfig({ codeminity: { skipAuth: true } })
    const queue = createRefreshQueueMock()

    await handleAuthRequest(request, config, queue)

    expect(refreshSpy).not.toHaveBeenCalled()
    expect(getToken).not.toHaveBeenCalled()
  })

  it('emits refresh failed event and continues request after refresh failure', async () => {
    const onEvent = vi.fn()

    const config: Config = {
      getToken: vi.fn().mockResolvedValue('token'),
      onEvent
    }

    const error = new Error('refresh failed') as AxiosError

    error.isAxiosError = true

    vi.spyOn(dependencies, 'handleRefreshToken').mockRejectedValue(error)

    const request = createRequestConfig()
    const queue = createRefreshQueueMock()

    const result = await handleAuthRequest(request, config, queue)

    expect(onEvent).toHaveBeenCalledWith(ErrorEventEnum.AUTH_REFRESH_FAILED, error)

    expect(result.headers.get('Authorization')).toBe('Bearer token')
  })

  it('emits error callback when refresh fails with a non axios error', async () => {
    const onError = vi.fn()

    const config: Config = {
      getToken: vi.fn().mockResolvedValue('token'),
      onError
    }

    const error = new Error('refresh failed')

    vi.spyOn(dependencies, 'handleRefreshToken').mockRejectedValue(error)

    await handleAuthRequest(createRequestConfig(), config, createRefreshQueueMock())

    expect(onError).toHaveBeenCalledWith(error)
  })

  it('emits error callback when getToken fails with a non axios error', async () => {
    const onError = vi.fn()

    const error = new Error('token failed')

    const config: Config = {
      getToken: vi.fn().mockRejectedValue(error),
      onError
    }

    vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    await handleAuthRequest(createRequestConfig(), config, createRefreshQueueMock())

    expect(onError).toHaveBeenCalledWith(error)
  })

  it('skips auth when getToken is not configured', async () => {
    const refreshSpy = vi.spyOn(dependencies, 'handleRefreshToken')

    const config = createAuthConfig({
      tokenMode: TokenModeEnum.JWT,
      getToken: undefined
    })

    const request = createRequestConfig()
    const queue = createRefreshQueueMock()

    const result = await handleAuthRequest(request, config, queue)

    expect(refreshSpy).not.toHaveBeenCalled()
    expect(result).toBe(request)
  })

  it('does not attach Authorization header when token is empty', async () => {
    const config = createAuthConfig({
      getToken: vi.fn().mockResolvedValue(undefined)
    })

    const request = createRequestConfig()

    const result = await handleAuthRequest(request, config, createRefreshQueueMock())

    expect(result.headers.get('Authorization')).toBeUndefined()
  })

  it('emits token failed event when getToken throws axios error', async () => {
    const onEvent = vi.fn()

    const error = new Error('token failed') as AxiosError
    error.isAxiosError = true

    const config: Config = {
      getToken: vi.fn().mockRejectedValue(error),
      onEvent
    }

    vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    await handleAuthRequest(createRequestConfig(), config, createRefreshQueueMock())

    expect(onEvent).toHaveBeenCalledWith(ErrorEventEnum.AUTH_TOKEN_FAILED, error)
  })
})
