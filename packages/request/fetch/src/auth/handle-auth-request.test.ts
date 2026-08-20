import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dependencies, TokenModeEnum } from '@codeminity/request-core'
import {
  createAuthConfig,
  createRefreshQueue as createRefreshQueueMock
} from '@codeminity/request-core/test-utils'

import { createRequestInit } from '../shared/mocks/create-request-init.js'

import { handleAuthRequest } from './handle-auth-request.js'

import type { Config } from '../shared/config.interface.js'

type GetToken = NonNullable<Config['getToken']>
type OnEvent = NonNullable<Config['onEvent']>
type OnError = NonNullable<Config['onError']>

const TEST_INPUT = '/test'

describe('handleAuthRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('enables credentials: include in COOKIE mode', async () => {
    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE }) as Config
    const init = createRequestInit()
    const queue = createRefreshQueueMock()

    const result = await handleAuthRequest(TEST_INPUT, init, config, queue)

    expect(result.credentials).toBe('include')
  })

  it('warns about an insecure URL string when in COOKIE mode', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE }) as Config
    const init = createRequestInit()
    const queue = createRefreshQueueMock()

    await handleAuthRequest('http://insecure.example.com/test', init, config, queue)

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('http://insecure.example.com')

    warn.mockRestore()
  })

  it('warns about an insecure URL when input is a URL instance', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE }) as Config
    const init = createRequestInit()
    const queue = createRefreshQueueMock()

    await handleAuthRequest(
      new URL('http://insecure-url-instance.example.com/test'),
      init,
      config,
      queue
    )

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('http://insecure-url-instance.example.com')

    warn.mockRestore()
  })

  it('warns about an insecure URL when input is a Request instance', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE }) as Config
    const init = createRequestInit()
    const queue = createRefreshQueueMock()

    await handleAuthRequest(
      new Request('http://insecure-request-instance.example.com/test'),
      init,
      config,
      queue
    )

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('http://insecure-request-instance.example.com')

    warn.mockRestore()
  })

  it('does not warn for a secure URL', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE }) as Config
    const init = createRequestInit()
    const queue = createRefreshQueueMock()

    await handleAuthRequest('https://secure.example.com/test', init, config, queue)

    expect(warn).not.toHaveBeenCalled()

    warn.mockRestore()
  })

  it('warns about a relative URL when the page itself is served insecurely (simulated browser)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    vi.stubGlobal('document', { baseURI: 'http://insecure-page.example.com/app' })

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE }) as Config
    const init = createRequestInit()
    const queue = createRefreshQueueMock()

    await handleAuthRequest('/orders', init, config, queue)

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('http://insecure-page.example.com')

    warn.mockRestore()
    vi.unstubAllGlobals()
  })

  it('does not warn about a relative URL when the page itself is served securely (simulated browser)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    vi.stubGlobal('document', { baseURI: 'https://secure-page.example.com/app' })

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE }) as Config
    const init = createRequestInit()
    const queue = createRefreshQueueMock()

    await handleAuthRequest('/orders', init, config, queue)

    expect(warn).not.toHaveBeenCalled()

    warn.mockRestore()
    vi.unstubAllGlobals()
  })

  it('does not warn about a relative URL outside a browser (no document to resolve against)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE }) as Config
    const init = createRequestInit()
    const queue = createRefreshQueueMock()

    await handleAuthRequest('/orders', init, config, queue)

    expect(warn).not.toHaveBeenCalled()

    warn.mockRestore()
  })

  it('falls back to the raw (already-absolute) input when it cannot be resolved against an invalid document.baseURI', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    vi.stubGlobal('document', { baseURI: 'not-a-valid-base' })

    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE }) as Config
    const init = createRequestInit()
    const queue = createRefreshQueueMock()

    await handleAuthRequest('http://insecure-fallback.example.com/x', init, config, queue)

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('http://insecure-fallback.example.com')

    warn.mockRestore()
    vi.unstubAllGlobals()
  })

  it('does not enable credentials: include in COOKIE mode when skipAuth is set for the request', async () => {
    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE }) as Config
    const init = createRequestInit({ codeminity: { skipAuth: true } })
    const queue = createRefreshQueueMock()

    const result = await handleAuthRequest(TEST_INPUT, init, config, queue)

    expect(result.credentials).toBeUndefined()
  })

  it('calls refresh before token and sets header', async () => {
    const refreshSpy = vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    const getToken = vi.fn<GetToken>().mockResolvedValue('token123')

    const config = createAuthConfig({ tokenMode: TokenModeEnum.JWT, getToken }) as Config
    const init = createRequestInit()
    const queue = createRefreshQueueMock()

    const result = await handleAuthRequest(TEST_INPUT, init, config, queue)

    expect(refreshSpy).toHaveBeenCalledTimes(1)
    expect(getToken).toHaveBeenCalledTimes(1)
    expect((result.headers as Headers).get('Authorization')).toBe('Bearer token123')
  })

  it('does not attempt token refresh when skipAuth is set for the request', async () => {
    const refreshSpy = vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    const getToken = vi.fn<GetToken>().mockResolvedValue('token123')

    const config = createAuthConfig({ tokenMode: TokenModeEnum.JWT, getToken }) as Config
    const init = createRequestInit({ codeminity: { skipAuth: true } })
    const queue = createRefreshQueueMock()

    await handleAuthRequest(TEST_INPUT, init, config, queue)

    expect(refreshSpy).not.toHaveBeenCalled()
    expect(getToken).not.toHaveBeenCalled()
  })

  it('skips auth entirely when the request signal is already aborted', async () => {
    const refreshSpy = vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    const getToken = vi.fn<GetToken>().mockResolvedValue('token123')

    const config = createAuthConfig({ tokenMode: TokenModeEnum.JWT, getToken }) as Config

    const controller = new AbortController()

    controller.abort()

    const init = createRequestInit({ signal: controller.signal })
    const queue = createRefreshQueueMock()

    const result = await handleAuthRequest(TEST_INPUT, init, config, queue)

    expect(result).toBe(init)
    expect(refreshSpy).not.toHaveBeenCalled()
    expect(getToken).not.toHaveBeenCalled()
  })

  it('emits refresh failed event and error, and continues to attach the token', async () => {
    const onEvent = vi.fn<OnEvent>()
    const onError = vi.fn<OnError>()

    const error = new Error('refresh failed')

    vi.spyOn(dependencies, 'handleRefreshToken').mockRejectedValue(error)

    const config: Config = {
      ...createAuthConfig({ getToken: vi.fn<GetToken>().mockResolvedValue('token') }),
      onEvent,
      onError
    }

    const init = createRequestInit()

    const result = await handleAuthRequest(TEST_INPUT, init, config, createRefreshQueueMock())

    const expectedOutcome = { input: TEST_INPUT, init, error }

    expect(onEvent).toHaveBeenCalledWith('auth_refresh_failed', expectedOutcome)
    expect(onError).toHaveBeenCalledWith(expectedOutcome)
    expect((result.headers as Headers).get('Authorization')).toBe('Bearer token')
  })

  it('skips auth when getToken is not configured', async () => {
    const refreshSpy = vi.spyOn(dependencies, 'handleRefreshToken')

    const config = createAuthConfig({ tokenMode: TokenModeEnum.JWT, getToken: undefined }) as Config
    const init = createRequestInit()
    const queue = createRefreshQueueMock()

    const result = await handleAuthRequest(TEST_INPUT, init, config, queue)

    expect(refreshSpy).not.toHaveBeenCalled()
    expect(result).toBe(init)
  })

  it('does not attach Authorization header when token is empty', async () => {
    const config = createAuthConfig({
      getToken: vi.fn<GetToken>().mockResolvedValue(null)
    }) as Config

    const result = await handleAuthRequest(
      TEST_INPUT,
      createRequestInit(),
      config,
      createRefreshQueueMock()
    )

    expect(result.headers).toBeUndefined()
  })

  it('emits token failed event and error when getToken throws', async () => {
    const onEvent = vi.fn<OnEvent>()
    const onError = vi.fn<OnError>()

    const error = new Error('token failed')

    const config: Config = {
      ...createAuthConfig({ getToken: vi.fn<GetToken>().mockRejectedValue(error) }),
      onEvent,
      onError
    }

    vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    const init = createRequestInit()

    await handleAuthRequest(TEST_INPUT, init, config, createRefreshQueueMock())

    const expectedOutcome = { input: TEST_INPUT, init, error }

    expect(onEvent).toHaveBeenCalledWith('auth_token_failed', expectedOutcome)
    expect(onError).toHaveBeenCalledWith(expectedOutcome)
  })
})
