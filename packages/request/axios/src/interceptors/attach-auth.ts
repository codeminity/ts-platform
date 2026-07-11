import { type AxiosInstance } from 'axios'

import type { RefreshQueue } from '@codeminity/request-core'

import { handleAuthRequest } from '../handlers/auth-request'

import type { Config } from '../interfaces/config'

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
