import { type AxiosInstance } from 'axios'

import { handleResponseError } from './response-error.js'

import type { Config } from './config.interface.js'

export function attachResponseInterceptor(instance: AxiosInstance, config: Config): void {
  instance.interceptors.response.use(
    (response) => response,
    (error) => handleResponseError(instance, config, error)
  )
}
