import { type InternalAxiosRequestConfig, isAxiosError } from 'axios'

import {
  dependencies,
  TokenModeEnum,
  warnIfInsecureUrl,
  type RefreshQueue
} from '@codeminity/request-core'

import { ErrorEventEnum } from '../errors/error-event.enum.js'

import { createAuthorizationHeader } from './create-auth-header.js'

import type { ErrorEvent } from '../errors/error-event.type.js'
import type { Config } from '../shared/config.interface.js'
import type { InternalRequestConfig } from '../shared/request-config.interface.js'

// Not routed through request-core's `emitterCallback`: that fires `onEvent`
// unconditionally, but axios's own documented contract only fires it for a
// real `AxiosError` (a user's `getToken`/`refreshToken` can throw anything).
// `onError` still fires regardless of error type, matching `emitterCallback`'s
// own behavior for that half. Each callback gets its own try/catch so a
// throwing `onEvent` can't suppress `onError`, and a throwing `onError`
// can't propagate out and break the request.
async function emitAuthFailure(event: ErrorEvent, error: unknown, config: Config): Promise<void> {
  if (isAxiosError(error)) {
    try {
      // Stryker disable next-line OptionalChaining: equivalent mutant — this
      // catch already swallows a missing-callback TypeError the same way it
      // swallows any other callback failure.
      await config.onEvent?.(event, error)
    } catch {
      /* empty */
    }
  }

  try {
    // Stryker disable next-line OptionalChaining: equivalent mutant — see above.
    await config.onError?.(error)
  } catch {
    /* empty */
  }
}

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
  // Already aborted (e.g. cancelled during a retry's backoff wait) — skip
  // straight past auth/refresh entirely. The dispatch layer rejects an
  // aborted request on its own with the correct abort error; there's no
  // point spending a real refreshToken() call on a request that's already
  // doomed.
  if (request.signal?.aborted) return request

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
    await emitAuthFailure(ErrorEventEnum.AUTH_REFRESH_FAILED, error, config)
  }

  try {
    const token = await config.getToken()

    if (token) {
      warnIfInsecureUrl(resolveRequestUrl(request))
      request.headers = createAuthorizationHeader(request.headers, token)
    }
  } catch (error) {
    await emitAuthFailure(ErrorEventEnum.AUTH_TOKEN_FAILED, error, config)
  }

  return request
}
