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

  it('warns about an insecure URL when in COOKIE mode', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE })
    const request = createRequestConfig({ baseURL: 'http://insecure.example.com', url: '/api' })

    await handleAuthRequest(request, config, createRefreshQueueMock())

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('http://insecure.example.com')

    warn.mockRestore()
  })

  it('does not warn for a secure baseURL in COOKIE mode', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE })
    const request = createRequestConfig({ baseURL: 'https://secure.example.com', url: '/api' })

    await handleAuthRequest(request, config, createRefreshQueueMock())

    expect(warn).not.toHaveBeenCalled()

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

  it('prefers an absolute request url over a secure baseURL', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE })
    const request = createRequestConfig({
      baseURL: 'https://secure-base.example.com',
      url: 'http://insecure-absolute.example.com/x'
    })

    await handleAuthRequest(request, config, createRefreshQueueMock())

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('http://insecure-absolute.example.com')

    warn.mockRestore()
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

  it('does not warn about a relative url when the page itself is served securely (simulated browser)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    vi.stubGlobal('document', { baseURI: 'https://secure-page.example.com/app' })

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE })
    const request = createRequestConfig({ url: '/orders' })

    await handleAuthRequest(request, config, createRefreshQueueMock())

    expect(warn).not.toHaveBeenCalled()

    warn.mockRestore()
    vi.unstubAllGlobals()
  })

  it('does not warn about a relative url outside a browser (no document to resolve against)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE })
    const request = createRequestConfig({ url: '/orders' })

    await handleAuthRequest(request, config, createRefreshQueueMock())

    expect(warn).not.toHaveBeenCalled()

    warn.mockRestore()
  })

  it('prefers a configured baseURL over document.baseURI (simulated browser)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    vi.stubGlobal('document', { baseURI: 'https://secure-page.example.com/app' })

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE })
    const request = createRequestConfig({
      baseURL: 'http://insecure-base.example.com',
      url: '/orders'
    })

    await handleAuthRequest(request, config, createRefreshQueueMock())

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('http://insecure-base.example.com')

    warn.mockRestore()
    vi.unstubAllGlobals()
  })

  it('does not enable withCredentials in COOKIE mode when skipAuth is set for the request', async () => {
    const config = createAuthConfig({
      tokenMode: TokenModeEnum.COOKIE
    })

    const request = createRequestConfig({ codeminity: { skipAuth: true } })
    const queue = createRefreshQueueMock()

    const result = await handleAuthRequest(request, config, queue)

    expect(result.withCredentials).toBeUndefined()
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

  it('skips auth entirely when the request signal is already aborted', async () => {
    const refreshSpy = vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    const getToken = vi.fn().mockResolvedValue('token123')

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

  it('calls both onEvent and onError when refresh fails with an axios error', async () => {
    const onEvent = vi.fn()
    const onError = vi.fn()

    const config: Config = {
      getToken: vi.fn().mockResolvedValue('token'),
      onEvent,
      onError
    }

    const error = new Error('refresh failed') as AxiosError

    error.isAxiosError = true

    vi.spyOn(dependencies, 'handleRefreshToken').mockRejectedValue(error)

    await handleAuthRequest(createRequestConfig(), config, createRefreshQueueMock())

    expect(onEvent).toHaveBeenCalledWith(ErrorEventEnum.AUTH_REFRESH_FAILED, error)
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('does not throw when refresh fails with an axios error and onEvent is not provided', async () => {
    const config: Config = {
      getToken: vi.fn().mockResolvedValue('token')
    }

    const error = new Error('refresh failed') as AxiosError

    error.isAxiosError = true

    vi.spyOn(dependencies, 'handleRefreshToken').mockRejectedValue(error)

    const request = createRequestConfig()

    await expect(handleAuthRequest(request, config, createRefreshQueueMock())).resolves.toBe(
      request
    )
  })

  it('still calls onError when onEvent throws', async () => {
    const onEvent = vi.fn().mockImplementation(() => {
      throw new Error('broken onEvent')
    })
    const onError = vi.fn()

    const config: Config = {
      getToken: vi.fn().mockResolvedValue('token'),
      onEvent,
      onError
    }

    const error = new Error('refresh failed') as AxiosError

    error.isAxiosError = true

    vi.spyOn(dependencies, 'handleRefreshToken').mockRejectedValue(error)

    const request = createRequestConfig()

    await expect(handleAuthRequest(request, config, createRefreshQueueMock())).resolves.toBe(
      request
    )

    expect(onEvent).toHaveBeenCalledWith(ErrorEventEnum.AUTH_REFRESH_FAILED, error)
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('does not throw when onError itself throws', async () => {
    const onError = vi.fn().mockImplementation(() => {
      throw new Error('broken onError')
    })

    const config: Config = {
      getToken: vi.fn().mockResolvedValue('token'),
      onError
    }

    const error = new Error('refresh failed') as AxiosError

    error.isAxiosError = true

    vi.spyOn(dependencies, 'handleRefreshToken').mockRejectedValue(error)

    const request = createRequestConfig()

    await expect(handleAuthRequest(request, config, createRefreshQueueMock())).resolves.toBe(
      request
    )

    expect(onError).toHaveBeenCalledWith(error)
  })

  it('emits error callback but not onEvent when refresh fails with a non axios error', async () => {
    const onEvent = vi.fn()
    const onError = vi.fn()

    const config: Config = {
      getToken: vi.fn().mockResolvedValue('token'),
      onEvent,
      onError
    }

    const error = new Error('refresh failed')

    vi.spyOn(dependencies, 'handleRefreshToken').mockRejectedValue(error)

    await handleAuthRequest(createRequestConfig(), config, createRefreshQueueMock())

    expect(onError).toHaveBeenCalledWith(error)
    expect(onEvent).not.toHaveBeenCalled()
  })

  it('emits error callback but not onEvent when getToken fails with a non axios error', async () => {
    const onEvent = vi.fn()
    const onError = vi.fn()

    const error = new Error('token failed')

    const config: Config = {
      getToken: vi.fn().mockRejectedValue(error),
      onEvent,
      onError
    }

    vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    await handleAuthRequest(createRequestConfig(), config, createRefreshQueueMock())

    expect(onError).toHaveBeenCalledWith(error)
    expect(onEvent).not.toHaveBeenCalled()
  })

  it('does not throw when getToken fails with a non axios error and onError is not provided', async () => {
    const config: Config = {
      getToken: vi.fn().mockRejectedValue(new Error('token failed'))
    }

    vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    const request = createRequestConfig()

    await expect(handleAuthRequest(request, config, createRefreshQueueMock())).resolves.toBe(
      request
    )
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

  it('calls both onEvent and onError when getToken fails with an axios error', async () => {
    const onEvent = vi.fn()
    const onError = vi.fn()

    const error = new Error('token failed') as AxiosError
    error.isAxiosError = true

    const config: Config = {
      getToken: vi.fn().mockRejectedValue(error),
      onEvent,
      onError
    }

    vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    await handleAuthRequest(createRequestConfig(), config, createRefreshQueueMock())

    expect(onEvent).toHaveBeenCalledWith(ErrorEventEnum.AUTH_TOKEN_FAILED, error)
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('does not throw when getToken fails with an axios error and onEvent is not provided', async () => {
    const error = new Error('token failed') as AxiosError
    error.isAxiosError = true

    const config: Config = {
      getToken: vi.fn().mockRejectedValue(error)
    }

    vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    const request = createRequestConfig()

    await expect(handleAuthRequest(request, config, createRefreshQueueMock())).resolves.toBe(
      request
    )
  })
})
