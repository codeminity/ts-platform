import { type AxiosInstance } from 'axios'

import { handleResponseError } from './response-error'

import type { Config } from './config.interface'

export function attachResponseInterceptor(instance: AxiosInstance, config: Config): void {
  instance.interceptors.response.use(
    (response) => response,
    (error) => handleResponseError(instance, config, error)
  )
}
