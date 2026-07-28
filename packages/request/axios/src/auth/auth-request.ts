import { type InternalAxiosRequestConfig, isAxiosError } from 'axios'

import { dependencies, TokenModeEnum, type RefreshQueue } from '@codeminity/request-core'

import { ErrorEventEnum } from '../errors/error-event.enum'

import { createAuthorizationHeader } from './create-auth-header'

import type { Config } from '../shared/config.interface'
import type { InternalRequestConfig } from '../shared/request-config.interface'

export async function handleAuthRequest(
  request: InternalAxiosRequestConfig,
  config: Config,
  refreshQueue: RefreshQueue
): Promise<InternalAxiosRequestConfig> {
  const requestConfig = request as InternalRequestConfig
  const codeminity = requestConfig.codeminity

  if (codeminity?.skipAuth) return request

  if (config.tokenMode === TokenModeEnum.COOKIE) {
    request.withCredentials = true
    return request
  }

  if (!config.getToken) {
    return request
  }

  try {
    await dependencies.handleRefreshToken(config, refreshQueue)
  } catch (error) {
    if (isAxiosError(error)) {
      await config.onEvent?.(ErrorEventEnum.AUTH_REFRESH_FAILED, error)
    } else {
      await config.onError?.(error)
    }
  }

  try {
    const token = await config.getToken()

    if (token) {
      request.headers = createAuthorizationHeader(request.headers, token)
    }
  } catch (error) {
    if (isAxiosError(error)) {
      await config.onEvent?.(ErrorEventEnum.AUTH_TOKEN_FAILED, error)
    } else {
      await config.onError?.(error)
    }
  }

  return request
}
