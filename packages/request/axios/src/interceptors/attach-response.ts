import { type AxiosInstance } from 'axios'

import { handleResponseError } from '../handlers/response-error'

import type { Config } from '../interfaces/config'

export function attachResponseInterceptor(instance: AxiosInstance, config: Config): void {
  instance.interceptors.response.use(
    (response) => response,
    (error) => handleResponseError(instance, config, error)
  )
}
