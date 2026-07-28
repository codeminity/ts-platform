import { TokenModeEnum, type RefreshQueue } from '@codeminity/request-core'

import { emitterCallback } from '../errors/emit-error-event'
import { ErrorEventEnum } from '../errors/error-event.enum'

import { createAuthorizationHeader } from './create-auth-header'
import { dependencies } from './dependencies'

import type { Config } from '../shared/config.interface'
import type { FetchRequestInit } from '../shared/request-config.interface'

export async function handleAuthRequest(
  input: RequestInfo | URL,
  init: FetchRequestInit,
  config: Config,
  refreshQueue: RefreshQueue
): Promise<RequestInit> {
  const codeminity = init.codeminity

  if (codeminity?.skipAuth) return init

  if (config.tokenMode === TokenModeEnum.COOKIE) {
    return { ...init, credentials: 'include' }
  }

  if (!config.getToken) {
    return init
  }

  try {
    await dependencies.handleRefreshToken(config, refreshQueue)
  } catch (error) {
    await emitterCallback(ErrorEventEnum.AUTH_REFRESH_FAILED, { input, init, error }, config)
  }

  try {
    const token = await config.getToken()

    if (token) {
      return { ...init, headers: createAuthorizationHeader(init.headers, token) }
    }
  } catch (error) {
    await emitterCallback(ErrorEventEnum.AUTH_TOKEN_FAILED, { input, init, error }, config)
  }

  return init
}
