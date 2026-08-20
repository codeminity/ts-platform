import { type AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dependencies, TokenModeEnum } from '@codeminity/request-core'
import {
  createAuthConfig,
  createRefreshQueue as createRefreshQueueMock
} from '@codeminity/request-core/test-utils'

import { ErrorEventEnum } from '../errors/error-event.enum.js'
import { createRequestConfig } from '../shared/mocks/create-request-config.js'

import { handleAuthRequest } from './handle-auth-request.js'

import type { Config } from '../shared/config.interface.js'

type GetToken = NonNullable<Config['getToken']>
type OnEvent = NonNullable<Config['onEvent']>
type OnError = NonNullable<Config['onError']>

describe(handleAuthRequest, () => {
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

  it('resolves the baseURL alone when the request has no url', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE })
    const request = createRequestConfig({ baseURL: 'http://insecure-no-path.example.com' })
    delete request.url

    await handleAuthRequest(request, config, createRefreshQueueMock())

    expect(warn).toHaveBeenCalledTimes(1)

    warn.mockRestore()
  })

  it('falls back to the raw (already-absolute) url when it cannot be resolved against an invalid baseURL', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE })
    const request = createRequestConfig({
      baseURL: 'not-a-valid-base',
      url: 'http://insecure-fallback.example.com/x'
    })

    await handleAuthRequest(request, config, createRefreshQueueMock())

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('http://insecure-fallback.example.com')

    warn.mockRestore()
  })

  it('warns about a relative url when the page itself is served insecurely (simulated browser)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    vi.stubGlobal('document', { baseURI: 'http://insecure-page.example.com/app' })

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE })
    const request = createRequestConfig({ url: '/orders' })

    await handleAuthRequest(request, config, createRefreshQueueMock())

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('http://insecure-page.example.com')

    warn.mockRestore()
    vi.unstubAllGlobals()
  })

  it('does not attempt token refresh when skipAuth is set for the request', async () => {
    const refreshSpy = vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    const getToken = vi.fn<GetToken>().mockResolvedValue('token123')

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

  it('skips auth entirely when the request signal is already aborted', async () => {
    const refreshSpy = vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    const getToken = vi.fn<GetToken>().mockResolvedValue('token123')

    const config = createAuthConfig({
      tokenMode: TokenModeEnum.JWT,
      getToken
    })

    const controller = new AbortController()

    controller.abort()

    const request = createRequestConfig({ signal: controller.signal })
    const queue = createRefreshQueueMock()

    const result = await handleAuthRequest(request, config, queue)

    expect(result).toBe(request)
    expect(refreshSpy).not.toHaveBeenCalled()
    expect(getToken).not.toHaveBeenCalled()
  })

  it('emits refresh failed event and continues request after refresh failure', async () => {
    const onEvent = vi.fn<OnEvent>()

    const config: Config = {
      getToken: vi.fn<GetToken>().mockResolvedValue('token'),
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

  it('emits error callback but not onEvent when getToken fails with a non axios error', async () => {
    const onEvent = vi.fn<OnEvent>()
    const onError = vi.fn<OnError>()

    const error = new Error('token failed')

    const config: Config = {
      getToken: vi.fn<GetToken>().mockRejectedValue(error),
      onEvent,
      onError
    }

    vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    await handleAuthRequest(createRequestConfig(), config, createRefreshQueueMock())

    expect(onError).toHaveBeenCalledWith(error)
    expect(onEvent).not.toHaveBeenCalled()
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
      getToken: vi.fn<GetToken>().mockResolvedValue(null)
    })

    const request = createRequestConfig()

    const result = await handleAuthRequest(request, config, createRefreshQueueMock())

    expect(result.headers.get('Authorization')).toBeUndefined()
  })
})
