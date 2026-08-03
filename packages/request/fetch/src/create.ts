import { createRefreshQueue } from '@codeminity/request-core'

import { performRequest } from './shared/perform-request.js'

import type { Config } from './shared/config.interface.js'
import type { FetchRequestInit } from './shared/request-config.interface.js'

/**
 * Creates a `fetch`-compatible function wired with auth lifecycle, refresh
 * coordination, and retry — configured via `config`. Each call to `createFetch`
 * gets its own isolated refresh queue, independent of any other instance.
 *
 * @public
 */
export function createFetch(
  config: Config = {}
): (input: RequestInfo | URL, init?: FetchRequestInit) => Promise<Response> {
  const refreshQueue = createRefreshQueue()

  return (input, init = {}) => performRequest(input, init, config, refreshQueue)
}
