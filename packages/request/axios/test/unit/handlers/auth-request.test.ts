import { type AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TokenModeEnum } from '@codeminity/request-core'

import { ErrorEventEnum } from '../../../src/enum/error-event'
import { handleAuthRequest } from '../../../src/handlers/auth-request'
import { dependencies } from '../../../src/handlers/dependencies'
import { type Config } from '../../../src/interfaces/config'
import { createAuthConfig } from '../../mocks/create-auth-config'
import { createRefreshQueue } from '../../mocks/create-refresh-queue'
import { createRequestConfig } from '../../mocks/create-request-config'

describe('handleAuthRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('enables withCredentials in COOKIE mode', async () => {
    const config = createAuthConfig({
      tokenMode: TokenModeEnum.COOKIE
    })

    const request = createRequestConfig()
    const queue = createRefreshQueue()

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
    const queue = createRefreshQueue()

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
    const queue = createRefreshQueue()

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
    const queue = createRefreshQueue()

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

    await handleAuthRequest(createRequestConfig(), config, createRefreshQueue())

    expect(onError).toHaveBeenCalledWith(error)
  })
})
