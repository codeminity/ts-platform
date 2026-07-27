import axios from 'axios'

import { create } from './create'
import { getAxiosInstance } from './shared/get-axios-instance'

import type { Config } from './shared/config.interface'
import type { RequestConfig } from './shared/request-config.interface'

declare module 'axios' {
  interface CreateAxiosDefaults {
    codeminity?: Config
  }

  interface AxiosRequestConfig {
    codeminity?: RequestConfig
  }
}

// @codeminity/request-core exports
export type { AuthConfig } from '@codeminity/request-core'
export { TokenModeEnum } from '@codeminity/request-core'

export type { CallbackConfig } from './shared/callback-config.interface'
export type { Config } from './shared/config.interface'
export type { ErrorEvent } from './errors/error-event.type'
export { ErrorEventEnum } from './errors/error-event.enum'
export type { RequestConfig } from './shared/request-config.interface'
export type { RetryConfig } from './retry/retry-config.interface'

/**
 * The default export: a drop-in replacement for Axios's own default export,
 * with `create` overridden to return an instance wired with `@codeminity/axios` behavior.
 *
 * @public
 */
const configuredAxios: typeof axios & { create: typeof create } = Object.assign(
  getAxiosInstance,
  axios,
  { create }
)

export default configuredAxios

export * from 'axios'
export { create }
