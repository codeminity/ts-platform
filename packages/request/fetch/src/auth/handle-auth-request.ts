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
  // `new URL(...)` below coerces a URL instance via its own `toString()`/
  // `href` when this branch is skipped, producing the same resolved URL.
  if (input instanceof URL) return input.href
  if (input instanceof Request) return input.url

  // A relative `input` string is the common case in a browser SPA — the
  // Fetch spec itself resolves it against the page's location, so check
  // against that same origin instead of silently skipping the warning
  // entirely (the actual bug this guards against: `new URL('/orders')`
  // with no base throws, previously falling straight through to the raw,
  // unresolved '/orders' string). `@codeminity/fetch` has no `baseURL`
  // concept of its own to fall back to first, unlike axios's adapter.
  const base = typeof document === 'undefined' ? undefined : document.baseURI

  try {
    return new URL(input, base).href
  } catch {
    return input
  }
}

export async function handleAuthRequest(
  input: RequestInfo | URL,
  init: FetchRequestInit,
  config: Config,
  refreshQueue: RefreshQueue
): Promise<RequestInit> {
  // Already aborted (e.g. cancelled during a retry's backoff wait) — skip
  // straight past auth/refresh entirely. The dispatch layer rejects an
  // aborted request on its own with the correct abort error; there's no
  // point spending a real refreshToken() call on a request that's already
  // doomed.
  if (init.signal?.aborted) return init

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
