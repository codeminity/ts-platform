import { type InternalAxiosRequestConfig, isAxiosError } from 'axios'

import {
  dependencies,
  TokenModeEnum,
  warnIfInsecureUrl,
  type RefreshQueue
} from '@codeminity/request-core'

import { ErrorEventEnum } from '../errors/error-event.enum.js'

import { createAuthorizationHeader } from './create-auth-header.js'

import type { Config } from '../shared/config.interface.js'
import type { InternalRequestConfig } from '../shared/request-config.interface.js'

// No `if (!request.baseURL) return url` special case: `new URL(url,
// undefined)` behaves identically to omitting the base entirely — it
// resolves `url` when absolute, and throws (caught below) when `url` is
// relative and there's nothing to resolve it against.
function resolveRequestUrl(request: InternalAxiosRequestConfig): string {
  // Stryker disable next-line StringLiteral: equivalent mutant — this
  // fallback only ever feeds warnIfInsecureUrl, which reports the origin,
  // never the path; no fallback string content can change that.
  const url = request.url ?? ''

  try {
    return new URL(url, request.baseURL).toString()
  } catch {
    return url
  }
}

export async function handleAuthRequest(
  request: InternalAxiosRequestConfig,
  config: Config,
  refreshQueue: RefreshQueue
): Promise<InternalAxiosRequestConfig> {
  const requestConfig = request as InternalRequestConfig
  const codeminity = requestConfig.codeminity

  if (codeminity?.skipAuth) return request

  if (config.tokenMode === TokenModeEnum.COOKIE) {
    warnIfInsecureUrl(resolveRequestUrl(request))
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
    }
    await config.onError?.(error)
  }

  try {
    const token = await config.getToken()

    if (token) {
      warnIfInsecureUrl(resolveRequestUrl(request))
      request.headers = createAuthorizationHeader(request.headers, token)
    }
  } catch (error) {
    if (isAxiosError(error)) {
      await config.onEvent?.(ErrorEventEnum.AUTH_TOKEN_FAILED, error)
    }
    await config.onError?.(error)
  }

  return request
}
