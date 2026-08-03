import {
  dependencies,
  emitterCallback,
  TokenModeEnum,
  warnIfInsecureUrl,
  type RefreshQueue
} from '@codeminity/request-core'

import { ErrorEventEnum } from '../errors/error-event.enum.js'

import { createAuthorizationHeader } from './create-auth-header.js'

import type { Config } from '../shared/config.interface.js'
import type { FetchRequestInit } from '../shared/request-config.interface.js'

function resolveInputUrl(input: RequestInfo | URL): string {
  // Stryker disable next-line ConditionalExpression: equivalent mutant —
  // `new URL(...)` (this function's sole caller, via warnIfInsecureUrl)
  // coerces a URL instance via its own `toString()`/`href`, so skipping
  // this branch and falling through to `return input` produces the same
  // resolved URL either way.
  if (input instanceof URL) return input.href
  if (input instanceof Request) return input.url

  return input
}

export async function handleAuthRequest(
  input: RequestInfo | URL,
  init: FetchRequestInit,
  config: Config,
  refreshQueue: RefreshQueue
): Promise<RequestInit> {
  const codeminity = init.codeminity

  if (codeminity?.skipAuth) return init

  if (config.tokenMode === TokenModeEnum.COOKIE) {
    warnIfInsecureUrl(resolveInputUrl(input))
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
      warnIfInsecureUrl(resolveInputUrl(input))
      return { ...init, headers: createAuthorizationHeader(init.headers, token) }
    }
  } catch (error) {
    await emitterCallback(ErrorEventEnum.AUTH_TOKEN_FAILED, { input, init, error }, config)
  }

  return init
}
