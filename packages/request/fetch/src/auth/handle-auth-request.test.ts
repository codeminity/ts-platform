import { beforeEach, describe, expect, it, vi } from 'vitest'

import { dependencies, TokenModeEnum } from '@codeminity/request-core'
import {
  createAuthConfig,
  createRefreshQueue as createRefreshQueueMock
} from '@codeminity/request-core/test-utils'

import { createRequestInit } from '../mocks/create-request-init'

import { handleAuthRequest } from './handle-auth-request'

import type { Config } from '../shared/config.interface'

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

  it('does not enable credentials: include in COOKIE mode when skipAuth is set for the request', async () => {
    const config = createAuthConfig({ tokenMode: TokenModeEnum.COOKIE }) as Config
    const init = createRequestInit({ codeminity: { skipAuth: true } })
    const queue = createRefreshQueueMock()

    const result = await handleAuthRequest(TEST_INPUT, init, config, queue)

    expect(result.credentials).toBeUndefined()
  })

  it('calls refresh before token and sets header', async () => {
    const refreshSpy = vi.spyOn(dependencies, 'handleRefreshToken').mockResolvedValue(undefined)

    const getToken = vi.fn().mockResolvedValue('token123')

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

    const getToken = vi.fn().mockResolvedValue('token123')

    const config = createAuthConfig({ tokenMode: TokenModeEnum.JWT, getToken }) as Config
    const init = createRequestInit({ codeminity: { skipAuth: true } })
    const queue = createRefreshQueueMock()

    await handleAuthRequest(TEST_INPUT, init, config, queue)

    expect(refreshSpy).not.toHaveBeenCalled()
    expect(getToken).not.toHaveBeenCalled()
  })

  it('emits refresh failed event and error, and continues to attach the token', async () => {
    const onEvent = vi.fn()
    const onError = vi.fn()

    const error = new Error('refresh failed')

    vi.spyOn(dependencies, 'handleRefreshToken').mockRejectedValue(error)

    const config: Config = {
      ...createAuthConfig({ getToken: vi.fn().mockResolvedValue('token') }),
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
    const config = createAuthConfig({ getToken: vi.fn().mockResolvedValue(undefined) }) as Config

    const result = await handleAuthRequest(
      TEST_INPUT,
      createRequestInit(),
      config,
      createRefreshQueueMock()
    )

    expect(result.headers).toBeUndefined()
  })

  it('emits token failed event and error when getToken throws', async () => {
    const onEvent = vi.fn()
    const onError = vi.fn()

    const error = new Error('token failed')

    const config: Config = {
      ...createAuthConfig({ getToken: vi.fn().mockRejectedValue(error) }),
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
