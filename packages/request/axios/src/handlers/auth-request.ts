import { type InternalAxiosRequestConfig, isAxiosError } from 'axios'

import { TokenModeEnum, type RefreshQueue } from '@codeminity/request-core'

import { createAuthorizationHeader } from '../utils/create-auth-header'

import { dependencies } from './dependencies'

import type { Config } from '../interfaces/config'
import type { InternalRequestConfig } from '../interfaces/request-config'

export async function handleAuthRequest(
  request: InternalAxiosRequestConfig,
  config: Config,
  refreshQueue: RefreshQueue
): Promise<InternalAxiosRequestConfig> {
  const requestConfig = request as InternalRequestConfig
  const codeminity = requestConfig.codeminity

  if (config.tokenMode === TokenModeEnum.COOKIE) {
    request.withCredentials = true
    return request
  }

  try {
    await dependencies.handleRefreshToken(config, refreshQueue)
  } catch (error) {
    if (isAxiosError(error)) {
      await config.onEvent?.('auth_refresh_failed', error)
    } else {
      await config.onError?.(error)
    }
  }

  if (codeminity?.skipAuth || !config.getToken) {
    return request
  }

  try {
    const token = await config.getToken()

    if (token) {
      request.headers = createAuthorizationHeader(request.headers, token)
    }
  } catch (error) {
    if (isAxiosError(error)) {
      await config.onEvent?.('auth_token_failed', error)
    } else {
      await config.onError?.(error)
    }
  }

  return request
}
