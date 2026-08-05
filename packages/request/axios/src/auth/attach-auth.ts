import { type AxiosInstance } from 'axios'

import type { RefreshQueue } from '@codeminity/request-core'

import { handleAuthRequest } from './handle-auth-request.js'

import type { Config } from '../shared/config.interface.js'

export function attachAuthInterceptor(
  instance: AxiosInstance,
  config: Config,
  refreshQueue: RefreshQueue
): void {
  instance.interceptors.request.use(async (request) => {
    const result = await handleAuthRequest(request, config, refreshQueue)

    return result
  })
}
